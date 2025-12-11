import * as vscode from 'vscode';

// Fonction appelée lors de l'activation de l'extension
export function activate(context: vscode.ExtensionContext) {
	// Confirmation de l'activation dans la console
	console.log('Mobile Preview extension activated');

	// Enregistrement de la commande "mobile-preview.start"
	const disposable = vscode.commands.registerCommand('mobile-preview.start', async () => {
		// Affichage d'une notification de bienvenue
		await vscode.window.showInformationMessage('Mobile Preview - Hello World!');
	});

	// Ajout du disposable pour nettoyer la commande lors de la désactivation
	context.subscriptions.push(disposable);
}

// Fonction appelée lors de la désactivation de l'extension
export function deactivate() {}
