// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const homedir = require('os').homedir();
const fs = require('fs');
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	
	const readFile = fs.promises.readFile
	const writeFile = fs.promises.writeFile
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "orgcolor" is now active!')

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand

	//Create output channel
	let outputCh = vscode.window.createOutputChannel("Org Color Indicator");
	let configFile;
	let currentAliasStr = '';
	let aliasPath = '';
	let color = '';

	// function invertHex(hex) {
	// 	return (Number(`0x1${hex}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase()
	// }

	/**
	 * @param {string} hex
	 * @param {boolean} bw
	 */
	function invertColor(hex, bw) {
    if (hex.indexOf('#') === 0) {

        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
		var r, g, b
    r = parseInt(hex.slice(0, 2), 16),
		g = parseInt(hex.slice(2, 4), 16),
		b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        // https://stackoverflow.com/a/3943023/112731
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFDD';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b);
	}

	/**
	 * @param {string} str
	 * @param {number} [len]
	 */
	function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
	}	

	/**
	 * @param {string} file
	 */
	async function checkFile(file){
		
		if (vscode.workspace.workspaceFolders === undefined) {
			return vscode.window.showErrorMessage('Please open a workspaceFolder first')
		}
    const folderPath = vscode.workspace.workspaceFolders[0].uri
		const uri = vscode.Uri.joinPath(folderPath, file)
		aliasPath = uri.fsPath
		try {
			return readFile(aliasPath, 'utf-8')
			// outputCh.appendLine(aliasPath);
		} catch (error) {
			outputCh.appendLine(error);
		}
	}
	
	/**
	 * @param {string} [file]
	 */
	async function getConfigFile(file){

		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)

		const path = uri.fsPath
		outputCh.appendLine(path)

		try {
			configFile = await readFile(path, 'utf-8')
			// outputCh.appendLine(data)

		} catch (error) {
			// outputCh.appendLine(error)
			await createConfigFile(path)
			configFile = '{}';
			outputCh.appendLine('Config file was created.')
		} 
	}

	/**
	 * @param {fs.PathLike | fs.promises.FileHandle} path
	 */
	async function createConfigFile(path){
		await writeFile(path, '{}')
	}

	async function getColor(){

		let obj = JSON.parse(configFile)

		if (Object.keys(obj).includes(currentAliasStr)) {
			color = obj[currentAliasStr]
		}
		
	}

	/**
	 * @param {string} color
	 */
	function setStyle(color){
		const config = vscode.workspace.getConfiguration("workbench").get("colorCustomizations")
		// outputCh.appendLine(JSON.stringify(config))
		
		vscode.workspace.getConfiguration("workbench").update(
			"colorCustomizations",
			{
					...config,
					"statusBar.background": color,
					"statusBar.foreground": invertColor(color, true),
					// "titleBar.activeBackground": color,
					// "titleBar.activeForeground": invertColor(color, true),
			},
			1,
		)
	}

	async function inputNewColor() {
		const input = await vscode.window.showInputBox();
		color = input
	}

	/**
	 * @param {string} file
	 */
	async function updateConfigFile(file){

		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)

		const path = uri.fsPath

		const newConfig = { ...JSON.parse(configFile),  [currentAliasStr]: color }

		try {

			await writeFile(path, JSON.stringify(newConfig))
			outputCh.appendLine(JSON.stringify(newConfig))
			
		} catch (error) {
			outputCh.appendLine(error)
		} 
		
	}

	/**
	 * @param {string} [file]
	 */
	function trackFile(file){
		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)

		const path = uri.fsPath

		fs.watch(path, (event, filename) => {
			if (filename) {
				console.log(`${filename} file Changed`);
			}
		})
	}

	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('orgcolor.helloWorld', async function () {
		// The code you place here will be executed every time your command is executed

		try {
			
			if (!vscode.workspace) {
				return vscode.window.showErrorMessage('Please open a project folder first')
			}
			const data = await checkFile('.sfdx/sfdx-config.json')
			outputCh.appendLine('HELP'+data)

			const obj = JSON.parse(data)
			currentAliasStr = obj.defaultusername

			await getConfigFile('.sfdx/orgColor.json')
			outputCh.appendLine(configFile)

			await getColor()

			if(color === '') {
				await inputNewColor()
				await updateConfigFile('.sfdx/orgColor.json')
			}
			
			setStyle(color)
			
			trackFile('.sfdx/sfdx-config.json')
			// outputCh.appendLine(currentAliasStr)
			outputCh.show()

		} catch (e) {
			console.error("e", e);
		}
		
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from Org color indicator!');
	});

	context.subscriptions.push(disposable)
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}