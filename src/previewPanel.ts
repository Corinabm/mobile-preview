import * as vscode from 'vscode';

// Variable globale pour réutiliser le panel existant
// Évite d'ouvrir plusieurs panels pour la même fonctionnalité
let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Affiche une webview VS Code avec le QR code et l'URL du tunnel
 * Réutilise le panel existant si déjà ouvert
 *
 * @param context Contexte de l'extension pour gérer les subscriptions
 * @param port Numéro du port localhost détecté
 * @param url URL publique du tunnel
 * @param qrCodeDataUrl Image du QR code en format Data URL (base64)
 */
export function showPreviewPanel(
	context: vscode.ExtensionContext,
	port: number,
	url: string,
	qrCodeDataUrl: string
): void {
	// Si un panel existe déjà, le révéler et mettre à jour le contenu
	if (currentPanel) {
		currentPanel.reveal(vscode.ViewColumn.One);
		currentPanel.webview.html = getHtmlContent(port, url, qrCodeDataUrl);
		return;
	}

	// Créer un nouveau panel webview
	currentPanel = vscode.window.createWebviewPanel(
		'mobilePreview',           // Identifiant unique
		'Mobile Preview',          // Titre de l'onglet
		vscode.ViewColumn.One,     // Position dans l'éditeur
		{
			enableScripts: true,              // Activer JavaScript dans la webview
			retainContextWhenHidden: true,    // Conserver l'état quand masqué
			localResourceRoots: []            // Pas de ressources locales nécessaires
		}
	);

	// Définir le contenu HTML initial
	currentPanel.webview.html = getHtmlContent(port, url, qrCodeDataUrl);

	// Gestion des messages envoyés depuis la webview
	// acquireVsCodeApi() dans la webview permet de communiquer avec l'extension
	currentPanel.webview.onDidReceiveMessage(
		message => {
			if (message.type === 'copy') {
				// Copier l'URL dans le presse-papiers
				vscode.env.clipboard.writeText(message.url);
				vscode.window.showInformationMessage('Link copied to clipboard');
			}
		},
		undefined,
		context.subscriptions
	);

	// Nettoyer la référence quand le panel est fermé
	currentPanel.onDidDispose(
		() => {
			currentPanel = undefined;
		},
		undefined,
		context.subscriptions
	);
}

/**
 * Génère le contenu HTML de la webview
 * Design minimaliste avec Tailwind CSS et Google Fonts
 *
 * @param port Numéro du port
 * @param url URL publique du tunnel
 * @param qrCodeDataUrl Image du QR code en base64
 * @returns HTML complet de la webview
 */
function getHtmlContent(port: number, url: string, qrCodeDataUrl: string): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Mobile Preview</title>

			<!-- Tailwind CSS CDN -->
			<script src="https://cdn.tailwindcss.com"></script>

			<!-- Google Fonts -->
			<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

			<style>
				body {
					font-family: 'Inter', sans-serif;
				}
				h1 {
					font-family: 'IBM Plex Sans', sans-serif;
				}
			</style>
		</head>
		<body style="background: #F7F9FC">
			<!-- Container principal centré -->
			<div class="min-h-screen flex items-center justify-center p-4">
				<!-- Card principale -->
				<div class="max-w-md w-full mx-auto p-8 rounded-2xl" style="background: #FFFFFF; border: 1px solid #DDE3EA">

					<!-- Header -->
					<div class="text-center">
						<h1 class="text-2xl font-semibold" style="color: #0D0F12">
							Mobile Preview
						</h1>
						<p class="text-sm mt-1" style="color: #7A828D">
							Port ${port}
						</p>
					</div>

					<!-- QR Code -->
					<div class="mt-6">
						<img
							src="${qrCodeDataUrl}"
							alt="QR Code"
							class="w-64 h-64 mx-auto rounded-lg border"
							style="border-color: #DDE3EA"
						/>
						<p class="text-sm text-center mt-3" style="color: #7A828D">
							Scan with your mobile device to preview your localhost
						</p>
					</div>

					<!-- URL Section -->
					<div class="mt-6 p-4 rounded-lg" style="background: #FFFFFF; border: 1px solid #DDE3EA">
						<label class="text-xs uppercase tracking-wide mb-2 block" style="color: #7A828D">
							Public URL
						</label>
						<p class="font-mono text-sm break-all" style="color: #0D0F12">
							${url}
						</p>
					</div>

					<!-- Copy Button -->
					<button
						id="copyBtn"
						class="w-full mt-4 py-3 px-6 rounded-lg transition-colors duration-200 font-medium"
						style="background: #0D0F12; color: white"
						onmouseover="this.style.background='#1A1D23'"
						onmouseout="if(this.textContent==='Copy Link') this.style.background='#0D0F12'"
					>
						Copy Link
					</button>

				</div>
			</div>

			<script>
				// API VS Code pour communiquer avec l'extension
				const vscode = acquireVsCodeApi();
				const copyBtn = document.getElementById('copyBtn');

				// Gestion du clic sur le bouton Copy
				copyBtn.addEventListener('click', () => {
					// Feedback visuel immédiat
					copyBtn.textContent = '✓ Copied!';
					copyBtn.style.background = '#10B981';

					// Envoyer un message à l'extension pour copier l'URL
					// L'extension gère la copie dans le presse-papiers système
					vscode.postMessage({
						type: 'copy',
						url: '${url}'
					});

					// Restaurer l'état initial après 2 secondes
					setTimeout(() => {
						copyBtn.textContent = 'Copy Link';
						copyBtn.style.background = '#0D0F12';
					}, 2000);
				});

				// Raccourci clavier Ctrl/Cmd + C pour copier
				document.addEventListener('keydown', (e) => {
					if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
						e.preventDefault();
						copyBtn.click();
					}
				});
			</script>
		</body>
		</html>
	`;
}
