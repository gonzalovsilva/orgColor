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
	const ORG_COLOR_CONFIG_PATH = '.sfdx/orgColor.json'
	const SALESFORCE_ORG_CONFIG_PATH = '.sfdx/sfdx-config.json'
	const NAME_FOR_CUSTOM_TYPE = 'Custom'
	const NEW_PROJECT = 'New Project'
	const ORG_COLOR = 'Org Color'
	const DISABLE_COLOR = 'Disable'
	let configFile;
	let currentAliasStr = '';
	let aliasPath = '';
	let color = '';
	let orgType = '';
	let projectColor = '';
	let projectName = '';

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
		} catch (e) {
			console.error(e);
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
			configFile = '{}';
			await createConfigFile(path, configFile)
		} 
	}

	/**
	 * @param {fs.PathLike | fs.promises.FileHandle} path
	 * @param {string} content
	 */
	async function createConfigFile(path, content){
		await writeFile(path, content)
	}

	async function getOrg(){

		let obj = JSON.parse(configFile)
		let org = {};

		if (Object.keys(obj).includes(currentAliasStr)) {
			org.project = obj[currentAliasStr].project
			org.type = obj[currentAliasStr].type
			org.color = obj[currentAliasStr].color
		}
		
		return org;
	}

	/**
	 * @param {object} org
	 */
	function updateStyle(org){

		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		const colBars = JSON.parse(JSON.stringify( extensionConfig.get('setColorBars') ))
		const projectSettings = JSON.parse(JSON.stringify( extensionConfig.get('projects') ))
		let orgColor, invertedColor, projectColor, invertedProjectColor, neutralColor;

		if(org !== undefined){
			if(org.color !== undefined && org.color !== ''){
				orgColor = org.color
				invertedColor = invertColor(org.color, true)
				neutralColor = "#8b8680"
			}

			if(org.project !== undefined && org.project !== ''){
				if((Object.keys(projectSettings).includes(org.project))){
					projectColor = projectSettings[org.project];
					invertedProjectColor = invertColor(projectColor, true)
					neutralColor = "#8b8680"
				}
			}

		}else{
			orgColor = invertedColor = projectColor = invertedProjectColor = neutralColor = undefined;
		}

		let _color, _invertedColor, _neutralColor, _isDisable, _isOrgColor;
		let tmpObj = {};

		for (const key in colBars) {
			if (Object.hasOwnProperty.call(colBars, key)) {
				const el = colBars[key];

				_isDisable = el.includes(DISABLE_COLOR)
				_isOrgColor = el.includes(ORG_COLOR)
				_color = _isDisable ? undefined : _isOrgColor ? orgColor : projectColor
				_invertedColor = _isDisable ? undefined : _isOrgColor ? invertedColor : invertedProjectColor
				_neutralColor = _isDisable ? undefined : _color === undefined ? undefined : neutralColor

				switch (key) {
					case "statusBar":
						tmpObj["statusBar.background"] = _color
						tmpObj["statusBar.foreground"] =  _invertedColor
						tmpObj["statusBarItem.hoverBackground"] = _neutralColor
						tmpObj["statusBarItem.activeBackground"] = _neutralColor
						tmpObj["statusBar.border"] = _color
						break;
					case "titleBar":
						tmpObj["titleBar.activeBackground"] = _color
						tmpObj["titleBar.activeForeground"] = _invertedColor
						tmpObj["titleBar.border"] = _color
						tmpObj["titleBar.inactiveBackground"] = _color
						break;
					case "activityBar":
						tmpObj["activityBar.activeBackground"] = _neutralColor
						tmpObj["activityBar.activeBorder"] = _neutralColor
						tmpObj["activityBar.background"] = _color
						tmpObj["activityBar.foreground"] = _invertedColor
						break;
				}
			}
		}

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
		optionsArray.push({ label: NAME_FOR_CUSTOM_TYPE , description: 'Set your own Hex color', color : '' })

		const selected = await vscode.window.showQuickPick(
			optionsArray,
			{ placeHolder: 'Select the color that you want for the current org.' });

		return selected
	}

	async function selectProject(){

		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		const projectSettings = JSON.parse(JSON.stringify( extensionConfig.get('projects') ))

		let optionsArray = []
		optionsArray.push({ label: NEW_PROJECT , description: 'Enter a new project name', color : '' })
		for (var key in projectSettings) {
			if (projectSettings.hasOwnProperty(key)) {
				optionsArray.push({ label: key , description: ' Color: '+projectSettings[key] , color : projectSettings[key] })
			}
		}

		const selected = await vscode.window.showQuickPick(
			optionsArray,
			{ placeHolder: 'Select a project:' });

		return selected
	}

	async function inputNewColor() {

		const result = await selectColor();

		if(!result){
			return '';
		}
		let orgType = result.label;
		if(result.label !== NAME_FOR_CUSTOM_TYPE){
			color = result.color
			return orgType
		}
		const reg = /^#([0-9a-f]{3}){1,2}$/i;
		let input = await vscode.window.showInputBox({
			placeHolder: "#B44",
			ignoreFocusOut: true,
			prompt: 'Enter an hex color value',
			validateInput: (text) => {
				if (!reg.test(text)) {
						return 'You must enter a valid hex color value';
				} 	
			}
		})
		if(input === undefined || input === ''){
			return undefined
		}else{
			color = input
			return orgType
		}
	}

	async function assignOrgType() {
		orgType = await inputNewColor()
		if(orgType === undefined || orgType === '') return false;

		return true;
	}

	async function createNewProject() {

		const reg = /^#([0-9a-f]{3}){1,2}$/i;
		let input = await vscode.window.showInputBox({
			placeHolder: "Project Name",
			ignoreFocusOut: true,
			prompt: 'Enter the name of the project:'
		})

		if(input === undefined || input === ''){
			return false;
		}
		projectName = input

		input = await vscode.window.showInputBox({
			placeHolder: "#B44",
			ignoreFocusOut: true,
			prompt: 'Enter an hex color value for this project:',
			validateInput: (text) => {
				if (!reg.test(text)) {
					return 'You must enter a valid hex color value';
				}
			}
		})

		if(input === undefined || input === ''){
			return false;
		}

		projectColor = input;

		await setProjectConfig(projectName, projectColor)

		return true;
	}

	async function assignNewProject() {

		const result = await selectProject();

		if(!result) return false;

		if(result.label === NEW_PROJECT) return await createNewProject();

		projectName = result.label
		projectColor = result.color

		await setProjectConfig(projectName, projectColor)

		console.log('assignNewProject Done');
		
		return true;
	}

	/**
	 * @param {string} projName
	 * @param {string} projColor
	 */
	async function setProjectConfig(projName, projColor) {
		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		let projConfig = extensionConfig.get("projects", {});

		const newConfig = { ...projConfig,  [projName]: projColor }
		await extensionConfig.update('projects', newConfig, vscode.ConfigurationTarget.Global) 
	}
		
	/**
	 * @param {string} file
	 * @param {object} org
	 */
	async function updateConfigFile(file, org){
		
		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)
		const path = uri.fsPath
		
		const newConfig = { ...JSON.parse(configFile),  [currentAliasStr]: {"project": org.project, "type": org.type, "color": org.color} }
		
		configFile = JSON.stringify(newConfig)

		try {

			await writeFile(path, JSON.stringify(newConfig, null, 2))
			// console.log('file updated')
			
		} catch (e) {
			console.error(e);
		} 
		
	}

	/**
	 * @param {string} file
	 */
	async function updateProjects(file){

		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)
		const path = uri.fsPath

		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		const projects = JSON.parse(JSON.stringify( extensionConfig.get("projects", {}) ))

		try {
			let obj = JSON.parse(configFile)
			let toDecide = [];

			for (const org in obj) {
				if(obj[org].project !== undefined && !Object.keys(projects).includes(obj[org].project)){
					toDecide.push(org)
				}
			}

			if(toDecide.length > 0){
				const DELETE_OR_RENAME = await vscode.window.showWarningMessage(`You have deleted a project variable that's being used by some orgs. 
					Would you like to delete any config related to that default project variable or Assign a new Project to those ?`, 'Delete', 'Assign a new Project')

				let newProjectName;
				await (async () => {
					if(DELETE_OR_RENAME === 'Assign a new Project'){
						let trueOrFalse = await assignNewProject()
						if(trueOrFalse === true){
							newProjectName = projectName;
						}
					}
				})();

				for (let i = 0; i < toDecide.length; i++) {
					
					if(DELETE_OR_RENAME === 'Delete'){
						obj[toDecide[i]].project = undefined
					}else{
						obj[toDecide[i]].project = newProjectName
					}
				}
			}

			configFile = JSON.stringify(obj)
			await writeFile(path, JSON.stringify(obj, null, 2))

		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * @param {string} file
	 */
	async function updateDefaultColors(file){

		let homeURI = vscode.Uri.file(homedir);
		const uri = vscode.Uri.joinPath(homeURI, file)
		const path = uri.fsPath

		const extensionConfig = vscode.workspace.getConfiguration('orgcolor')
		const defaultColors = JSON.parse(JSON.stringify( extensionConfig.get('defaultOrgColors') ))

		try {
			let obj = JSON.parse(configFile)
			let toDecide = []
			const reg = /^#([0-9a-f]{3}){1,2}$/i;

			for (const org in obj) {
				if(obj[org].type !== NAME_FOR_CUSTOM_TYPE && Object.keys(defaultColors).includes(obj[org].type)){
					if(obj[org].color != defaultColors[obj[org].type] && reg.test(defaultColors[obj[org].type])){
						
						obj[org].color = defaultColors[obj[org].type]
					} 
				}
				if(obj[org].type !== NAME_FOR_CUSTOM_TYPE && Object.values(defaultColors).includes(obj[org].color)) {
					obj[org].type = Object.keys(defaultColors).find(key => defaultColors[key] === obj[org].color)
					
				}else if(obj[org].type !== NAME_FOR_CUSTOM_TYPE && !Object.keys(defaultColors).includes(obj[org].type)){

					toDecide.push(org)
				}
			}

			if(toDecide.length > 0){
				const DELETE_OR_RENAME = await vscode.window.showWarningMessage(`You have deleted a default color type that's being used by some orgs. 
					Would you like to delete any config related to that default color type or rename those to "${NAME_FOR_CUSTOM_TYPE}" ?`, 'Delete', 'Rename')

				for (let i = 0; i < toDecide.length; i++) {
					
					if(DELETE_OR_RENAME === 'Delete'){
						delete obj[toDecide[i]]
					}else{
						obj[toDecide[i]].type = NAME_FOR_CUSTOM_TYPE
					}
				}
			}

			configFile = JSON.stringify(obj)
			await writeFile(path, JSON.stringify(obj, null, 2))

		} catch (e) {
			console.error(e);
		}

	}

	/**
	 * @param {object} org
	 */
	async function updateOrgConfig(org){

		let toUpdate = await vscode.window.showInformationMessage("What would you like to update for this org ?", 'Project', 'Org Type', 'Both')

		console.log(toUpdate, '> toUpdate');

		await (async () => {
			if(toUpdate === 'Project' || toUpdate === 'Both'){
				let trueOrFalse = await assignNewProject()
				if(trueOrFalse === true){
					org.project = projectName;
				}
				console.log('toUpdate Project or Both');
			}
		})();

		await (async () => {
			if(toUpdate === 'Org Type' || toUpdate === 'Both'){
				let trueOrFalse = await assignOrgType()
				if(trueOrFalse === true){
					org.color = color;
					org.type = orgType;
				}
				console.log('toUpdate Org Type or Both');
			}
		})();

		return org;
	}

	async function main({ toUpdate = false, barsChanged = false, defaultColorsChanged = false, projectsChanged = false } = {}) {
		try {
			
			if (!vscode.workspace) {
				return vscode.window.showErrorMessage('Please open a project folder first')
			}
			color = '';
			projectColor = '';
			const exists = await checkFileExists(SALESFORCE_ORG_CONFIG_PATH)
			
			if(exists){
				const data = await checkFile(SALESFORCE_ORG_CONFIG_PATH)
				const obj = JSON.parse(data)
				currentAliasStr = obj.defaultusername
				
				await getConfigFile(ORG_COLOR_CONFIG_PATH)
				
				if(defaultColorsChanged){
					await updateDefaultColors(ORG_COLOR_CONFIG_PATH);
					let orgObj = await getOrg();
					(orgObj.color !== undefined) ? updateStyle(orgObj) : updateStyle(undefined)
					return
				}

				if(projectsChanged){
					await updateProjects(ORG_COLOR_CONFIG_PATH);
					let orgObj = await getOrg();
					(orgObj.project !== undefined) ? updateStyle(orgObj) : updateStyle(undefined)
					console.log('updateProjects Done')
					return
				}

				// let colorResult = await getColor()
				let orgObj = await getOrg();
				console.log(orgObj,'BEFORE')
				
				if(barsChanged){
					(orgObj.color !== undefined) ? updateStyle(orgObj) : updateStyle(undefined)
					return

				}
				
				await (async () => {
					if(toUpdate){
						orgObj = await updateOrgConfig(orgObj)
						console.log('updateOrgConfig Done')
					}
					
				})();

				let yesOrNo;
				let trueOrFalse;

				await (async () => {
					if (orgObj.project === undefined || orgObj.project === '') {
						yesOrNo = await vscode.window.showInformationMessage("The current org doesn't have a project assigned to it. Would you like to assign a new project ?", 'Yes', 'No')
						if(yesOrNo === 'Yes'){
							trueOrFalse = await assignNewProject()
							if(trueOrFalse === true){
								orgObj.project = projectName;
							}
						}
					}
				})();

				await (async () => {
					if (orgObj.color === undefined || orgObj.color === '') {
						yesOrNo = await vscode.window.showInformationMessage("The current org doesn't have a color assigned to it. Would you like to assign a new color ?", 'Yes', 'No')
						if(yesOrNo === 'Yes') {
							trueOrFalse = await assignOrgType()
							if(trueOrFalse === true){
								orgObj.color = color;
								orgObj.type = orgType;
							}
						}
					}
				})();
				
				console.log(orgObj,'AFTER')
				updateStyle(orgObj)
				console.log('updateStyle Done')

				if(Object.keys(orgObj).length !== 0 && orgObj.constructor === Object){
					await updateConfigFile('.sfdx/orgColor.json', orgObj)
					console.log('updateConfigFile Done')
				}
				
			}
		} catch (e) {
			console.error(e);
		}
	}

	let configWatcher = vscode.workspace.createFileSystemWatcher('**/sfdx-config.json', false, false, true)
	
	configWatcher.onDidChange(function (){
		vscode.commands.executeCommand('orgcolor.setOrgColor')
	})

	vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('orgcolor.setColorBars')) {
            main({barsChanged : true})
        }
    });

	vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('orgcolor.defaultOrgColors')) {
            main({defaultColorsChanged : true})
        }
    });
	
	vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('orgcolor.projects')) {
            main({projectsChanged : true})
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

	context.subscriptions.push( vscode.commands.registerCommand('orgcolor.setOrgColor', () => main() ) )
	
	context.subscriptions.push( vscode.commands.registerCommand('orgcolor.updateOrgColor', () => main({toUpdate: true}) ) )

	context.subscriptions.push( vscode.commands.registerCommand('orgcolor.syncDefaultColors', () => main({defaultColorsChanged: true}) ) )
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}