// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const homedir = require('os').homedir();
const fs = require('fs');
const { abort } = require('process');
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
	// let outputCh = vscode.window.createOutputChannel("Org Color Indicator");
	let configFile;
	let currentAliasStr = '';
	let aliasPath = '';
	let color = '';

	vscode.commands.executeCommand('orgcolor.helloWorld')

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
				// https://jsfiddle.net/bvpu1025/25/
        return (r * 0.299 + g * 0.887 + b * 0.114) > 186
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

	async function checkFileExists(file) {
		if (vscode.workspace.workspaceFolders === undefined) {
			vscode.window.showErrorMessage('Please open a workspaceFolder first')
			abort
		}
    const folderPath = vscode.workspace.workspaceFolders[0].uri
		const uri = vscode.Uri.joinPath(folderPath, file)
		aliasPath = uri.fsPath

		console.log(fs.promises.access(aliasPath, fs.constants.F_OK)
		.then(() => true)
		.catch(() => false))

		return fs.promises.access(aliasPath, fs.constants.F_OK)
						 .then(() => true)
						 .catch(() => false)
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
			// outputCh.appendLine(error);
		}
	}
	
	/**
	 * @param {string} [file]
	 */
	async function getConfigFile(file){

		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)

		const path = uri.fsPath
		// outputCh.appendLine(path)

		try {
			configFile = await readFile(path, 'utf-8')
			// outputCh.appendLine(data)

		} catch (error) {
			// outputCh.appendLine(error)
			await createConfigFile(path)
			configFile = '{}';
			// outputCh.appendLine('Config file was created.')
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
		console.log('in getColor() color = '+color)
		
		return color;
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
					"statusBarItem.hoverBackground": "#8b8680",
					"statusBarItem.activeBackground": "#8b8680",
					"statusBar.border": color


					// "titleBar.activeBackground": color,
					// "titleBar.activeForeground": invertColor(color, true),
					// "titleBar.border": color,
					// "titleBar.inactiveBackground": color
			},
			1,
		)
	}

	async function inputNewColor() {
		const reg = /^#([0-9a-f]{3}){1,2}$/i;
		vscode.window.showInputBox({
			placeHolder: "#B44",
			ignoreFocusOut: true,
			prompt: 'Enter two words',
			validateInput: (text) => {
				if (!reg.test(text)) {
						return 'You must enter a valid hex color value';
				} 	
			}
		}).then(input => {
			if(input === undefined || input === ''){
				abort
			}else{
				console.log("in inputNewColor() if input not undefined or '' = "+input)
				color = input
	
				updateConfigFile('.sfdx/orgColor.json')
				// outputCh.show()
			}
		});
	}
		
	/**
	 * @param {string} file
	 */
	async function updateConfigFile(file){
		
		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)
		
		const path = uri.fsPath
		
		const newConfig = { ...JSON.parse(configFile),  [currentAliasStr]: color }
		
		configFile = JSON.stringify(newConfig)
		// outputCh.appendLine('new config file : '+configFile)

		try {
			setStyle(color)

			await writeFile(path, newConfig)
			console.log('file updated')
			
		} catch (error) {
			// outputCh.appendLine(error)
		} 
		
	}


	let fileWatcher = vscode.workspace.createFileSystemWatcher('**/sfdx-config.json', false, false, true)
	
	fileWatcher.onDidChange(function (){
		// outputCh.appendLine(`${e} was changed.`)
		console.log('.sfdx/sfdx-config.json was changed.')
		vscode.commands.executeCommand('orgcolor.helloWorld')
	})
	

	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('orgcolor.helloWorld', async function () {
		// The code you place here will be executed every time your command is executed

		try {
			
			if (!vscode.workspace) {
				return vscode.window.showErrorMessage('Please open a project folder first')
			}
			// outputCh.clear();

			color = '';

			const exists = await checkFileExists('.sfdx/sfdx-config.json')

			if(exists){

				const data = await checkFile('.sfdx/sfdx-config.json')
				
				const obj = JSON.parse(data)
				currentAliasStr = obj.defaultusername
				// outputCh.appendLine(currentAliasStr)
	
				await getConfigFile('.sfdx/orgColor.json')
				// outputCh.appendLine('old config file : '+configFile)
				
				let colorResult = await getColor()

				console.log('in main() colorResult = '+colorResult)
				
				if(colorResult === '') {
					console.log("if colorResult === '' = "+colorResult)
					inputNewColor()

				}else{
					setStyle(color)
					// outputCh.show()
				}

			}


		} catch (e) {
			console.log("e", e);
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