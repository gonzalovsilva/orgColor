const homedir = require('os').homedir();
const fs = require('fs');
const { abort } = require('process');
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	
	const readFile = fs.promises.readFile
	const writeFile = fs.promises.writeFile
	let configFile;
	let currentAliasStr = '';
	let aliasPath = '';
	let color = '';

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

	/**
	 * @param {string} file
	 */
	async function checkFileExists(file) {
		if (vscode.workspace.workspaceFolders === undefined) {
			vscode.window.showErrorMessage('Please open a workspaceFolder first')
			abort
		}
    const folderPath = vscode.workspace.workspaceFolders[0].uri
		const uri = vscode.Uri.joinPath(folderPath, file)
		aliasPath = uri.fsPath

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
		} catch (error) {
		}
	}
	
	/**
	 * @param {string} [file]
	 */
	async function getConfigFile(file){

		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)

		const path = uri.fsPath

		try {
			configFile = await readFile(path, 'utf-8')

		} catch (error) {
			await createConfigFile(path)
			configFile = '{}';
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
		
		return color;
	}

	/**
	 * @param {string} color
	 */
	function updateStyle(color){

		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		const colBars = JSON.parse(JSON.stringify( extensionConfig.get('setColorBars') ))

		const invertedColor = color ? invertColor(color, true) :undefined
		const neutralColor = "#8b8680"
		let _true, _color, _invertedColor, _neutralColor;
		let tmpObj = {};

		_true = colBars.statusBar === true
		_color = _true ? color : undefined
		_invertedColor = _true ? invertedColor : undefined
		_neutralColor = _true ? neutralColor : undefined

		tmpObj["statusBar.background"] = _color
		tmpObj["statusBar.foreground"] =  _invertedColor
		tmpObj["statusBarItem.hoverBackground"] = _neutralColor
		tmpObj["statusBarItem.activeBackground"] = _neutralColor
		tmpObj["statusBar.border"] = _color

		_true = colBars.titleBar === true
		_color = _true ? color : undefined
		_invertedColor = _true ? invertedColor : undefined
		_neutralColor = _true ? neutralColor : undefined

		tmpObj["titleBar.activeBackground"] = _color
		tmpObj["titleBar.activeForeground"] = _invertedColor
		tmpObj["titleBar.border"] = _color
		tmpObj["titleBar.inactiveBackground"] = _color

		_true = colBars.activityBar === true
		_color = _true ? color : undefined
		_invertedColor = _true ? invertedColor : undefined
		_neutralColor = _true ? neutralColor : undefined

		tmpObj["activityBar.activeBackground"] = _neutralColor
		tmpObj["activityBar.activeBorder"] = _neutralColor
		tmpObj["activityBar.background"] = _color
		tmpObj["activityBar.foreground"] = _invertedColor

		vscode.workspace.getConfiguration("workbench").update("colorCustomizations", tmpObj, 0)
	}

	async function selectColor(){

		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		const orgColorSettings = JSON.parse(JSON.stringify( extensionConfig.get('defaultOrgColors') ))

		let optionsArray = []
		for (var key in orgColorSettings) {
			if (orgColorSettings.hasOwnProperty(key)) {
				optionsArray.push({ label: key , description: ' Default Color: '+orgColorSettings[key] , color : orgColorSettings[key] })
			}
		}
		optionsArray.push({ label: 'Custom' , description: 'Set your own Hex color', color : '' })

		const selected = await vscode.window.showQuickPick(
			optionsArray,
			{ placeHolder: 'Select the color that you want for the current org.' });

		return selected
	}

	async function inputNewColor() {

		const result = await selectColor();

		if(result){
			if(result.label === 'Custom'){
				const reg = /^#([0-9a-f]{3}){1,2}$/i;
				vscode.window.showInputBox({
					placeHolder: "#B44",
					ignoreFocusOut: true,
					prompt: 'Enter an hex color value',
					validateInput: (text) => {
						if (!reg.test(text)) {
								return 'You must enter a valid hex color value';
						} 	
					}
				}).then(input => {
					if(input === undefined || input === ''){
						abort
					}else{
						color = input
						updateConfigFile('.sfdx/orgColor.json')
					}
				});
				
			}
			else{
				color = result.color
				updateConfigFile('.sfdx/orgColor.json')
			}
		}
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

		try {
			updateStyle(color)

			await writeFile(path, JSON.stringify(newConfig, null, 2))
			// console.log('file updated')
			
		} catch (error) {
		} 
		
	}


	async function main({ toUpdate = false, settingsChanged = false } = {}) {
		try {
			if (!vscode.workspace) {
				return vscode.window.showErrorMessage('Please open a project folder first')
			}
			color = '';
			const exists = await checkFileExists('.sfdx/sfdx-config.json')

			if(exists){
				const data = await checkFile('.sfdx/sfdx-config.json')
				const obj = JSON.parse(data)
				currentAliasStr = obj.defaultusername
	
				await getConfigFile('.sfdx/orgColor.json')
				
				let colorResult = await getColor()
				
				if(settingsChanged){
					colorResult !== '' ? updateStyle(color) : updateStyle(undefined)

				}else{
					if(colorResult === '') {
						const YES_OR_NOT = await vscode.window.showInformationMessage("The current org doesn't have a color assigned to it. Would you like to assign a new color ?", 'Yes', 'No')
						if(YES_OR_NOT === 'Yes'){
							inputNewColor()
						}
	
					}else{
						toUpdate ? inputNewColor() : updateStyle(color)
					}
				}

				
			}
		} catch (e) {
			console.error(e);
		}
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from Org color indicator!');
	}

	let configWatcher = vscode.workspace.createFileSystemWatcher('**/sfdx-config.json', false, false, true)
	
	configWatcher.onDidChange(function (){
		vscode.commands.executeCommand('orgcolor.setOrgColor')
	})

	vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('orgcolor.setColorBars')) {
            main({settingsChanged : true})
        }
    });
	
	// workaround cause at startup config is overwritten by live share extension
	const liveShareExtension = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
	function wait() {
		if (liveShareExtension && !liveShareExtension.isActive) {
			setTimeout(wait, 2000);
		} else {
			vscode.commands.executeCommand('orgcolor.setOrgColor')
		}
	}
	if(liveShareExtension !== undefined){
		wait()
	}else{
		vscode.commands.executeCommand('orgcolor.setOrgColor')
	}

	let disposable1 = vscode.commands.registerCommand('orgcolor.setOrgColor', () => main() );
	context.subscriptions.push(disposable1)
	
	let disposable2 = vscode.commands.registerCommand('orgcolor.updateOrgColor', () => main({toUpdate: true}) );
	context.subscriptions.push(disposable2)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}