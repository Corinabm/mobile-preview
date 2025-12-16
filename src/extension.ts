import * as vscode from 'vscode';
import { detectActivePort } from './portDetector';
import { createTunnel } from './tunnelManager';
import { generateQRCode } from './qrGenerator';
import { showPreviewPanel } from './previewPanel';

// Fonction appelée lors de l'activation de l'extension
export function activate(context: vscode.ExtensionContext) {
	// Confirmation de l'activation dans la console
	console.log('Mobile Preview extension activated');

	// Enregistrement de la commande principale "mobile-preview.start"
	const disposable = vscode.commands.registerCommand('mobile-preview.start', async () => {
		try {
			// ÉTAPE 1 : DÉTECTION DU PORT ACTIF
			// Recherche d'un serveur de développement actif sur les ports communs
			console.log('Recherche d\'un serveur local actif...');
			const port = await detectActivePort();

			// Vérifier si un port a été détecté
			if (!port) {
				vscode.window.showErrorMessage(
					'No local server found. Please start your dev server (npm run dev, php artisan serve, etc.)'
				);
				return;
			}

			// Port détecté avec succès
			vscode.window.showInformationMessage(`Server found on port ${port}`);
			console.log(`✅ Serveur détecté sur le port ${port}`);

			// ÉTAPE 2 : CRÉATION DU TUNNEL PUBLIC
			// Créer un tunnel VS Code pour exposer le localhost sur internet
			let tunnelUrl: string | null = null;

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Creating public tunnel...',
					cancellable: false
				},
				async () => {
					tunnelUrl = await createTunnel(port);
				}
			);

			// ÉTAPE 3 : GÉNÉRATION DU QR CODE (si le tunnel est configuré)
			// Si tunnelUrl est null, le tunnel n'est pas configuré
			// On affiche quand même le preview panel avec un message d'erreur et un tutoriel
			let qrCodeDataUrl: string | null = null;

			if (tunnelUrl) {
				// Tunnel configuré : générer le QR code
				console.log('Génération du QR code...');
				qrCodeDataUrl = await generateQRCode(tunnelUrl);

				if (!qrCodeDataUrl) {
					vscode.window.showErrorMessage('Failed to generate QR code');
					return;
				}

				console.log(`✅ Tunnel créé : ${tunnelUrl}`);
				console.log('✅ QR code généré avec succès');
			} else {
				// Tunnel non configuré : on affichera un message d'erreur dans la webview
				console.warn('⚠️  Tunnel non configuré - affichage du tutoriel de configuration');
			}

			// ÉTAPE 4 : AFFICHAGE DE LA WEBVIEW
			// Afficher la webview avec le QR code OU un message d'erreur + tutoriel
			showPreviewPanel(context, port, tunnelUrl, qrCodeDataUrl);

			// Message de succès final (seulement si le tunnel est configuré)
			if (tunnelUrl) {
				vscode.window.showInformationMessage(
					'Mobile Preview ready! Scan the QR code with your phone.'
				);
				console.log('Mobile Preview prêt !');
			} else {
				vscode.window.showWarningMessage(
					'Port forwarding not configured. Check the preview panel for setup instructions.'
				);
			}

		} catch (error) {
			// Gestion des erreurs inattendues
			// Logger l'erreur complète dans la console pour le debugging
			console.error('Erreur Mobile Preview:', error);

			// Afficher un message d'erreur générique à l'utilisateur
			vscode.window.showErrorMessage(
				'An error occurred. Check the console for details.'
			);
		}
	});

	// Ajouter la commande aux subscriptions pour le nettoyage
	context.subscriptions.push(disposable);
}

// Fonction appelée lors de la désactivation de l'extension
export function deactivate() {}
