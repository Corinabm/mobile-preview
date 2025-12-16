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
 * @param url URL publique du tunnel (null si non configuré)
 * @param qrCodeDataUrl Image du QR code en format Data URL (null si tunnel non configuré)
 */
export function showPreviewPanel(
	context: vscode.ExtensionContext,
	port: number,
	url: string | null,
	qrCodeDataUrl: string | null
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
 * @param url URL publique du tunnel (null si non configuré)
 * @param qrCodeDataUrl Image du QR code en base64 (null si tunnel non configuré)
 * @returns HTML complet de la webview
 */
function getHtmlContent(port: number, url: string | null, qrCodeDataUrl: string | null): string {
	// Si le tunnel n'est pas configuré, afficher le message d'erreur avec tutoriel
	if (!url || !qrCodeDataUrl) {
		return getErrorHtmlContent(port);
	}

	// Tunnel configuré : afficher le QR code normal
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

/**
 * Génère le contenu HTML pour l'état d'erreur (tunnel non configuré)
 * Affiche un message explicatif et un tutoriel avec icône d'aide
 *
 * @param port Numéro du port localhost détecté
 * @returns HTML complet avec message d'erreur et tutoriel
 */
function getErrorHtmlContent(port: number): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Mobile Preview - Configuration Required</title>

			<!-- Tailwind CSS CDN -->
			<script src="https://cdn.tailwindcss.com"></script>

			<!-- Google Fonts -->
			<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

			<style>
				body {
					font-family: 'Inter', sans-serif;
				}
				h1, h2 {
					font-family: 'IBM Plex Sans', sans-serif;
				}
				.help-icon {
					cursor: pointer;
					transition: all 0.2s;
				}
				.help-icon:hover {
					transform: scale(1.1);
				}
				.modal {
					display: none;
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.5);
					z-index: 1000;
					align-items: center;
					justify-content: center;
				}
				.modal.active {
					display: flex;
				}
			</style>
		</head>
		<body style="background: #F7F9FC">
			<!-- Icône d'aide (?) en haut à droite -->
			<div style="position: fixed; top: 20px; right: 20px; z-index: 100;">
				<button
					id="helpBtn"
					class="help-icon"
					style="width: 40px; height: 40px; border-radius: 50%; background: #0D0F12; color: white; border: none; font-size: 18px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
					title="How to configure port forwarding"
				>
					?
				</button>
			</div>

			<!-- Container principal centré -->
			<div class="min-h-screen flex items-center justify-center p-4">
				<!-- Card principale -->
				<div class="max-w-md w-full mx-auto p-8 rounded-2xl" style="background: #FFFFFF; border: 1px solid #DDE3EA">

					<!-- Header -->
					<div class="text-center">
						<h1 class="text-2xl font-semibold" style="color: #0D0F12">
							Mobile Preview
						</h1>
					</div>

					<!-- Warning Icon -->
					<div class="mt-6 flex justify-center">
						<div class="flex items-center justify-center w-20 h-20 rounded-full" style="background: #FEF3C7;">
							<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
								<line x1="12" y1="9" x2="12" y2="13"></line>
								<line x1="12" y1="17" x2="12.01" y2="17"></line>
							</svg>
						</div>
					</div>

					<!-- Error Message -->
					<div class="mt-6 text-center">
						<h2 class="text-lg font-semibold" style="color: #0D0F12">
							Port forwarding not configured
						</h2>
						<p class="text-sm mt-2" style="color: #7A828D">
							To preview your localhost on mobile, you need to configure port forwarding in VS Code.
						</p>
					</div>

					<!-- Quick Instructions -->
					<div class="mt-6 p-4 rounded-lg" style="background: #F7F9FC; border: 1px solid #DDE3EA">
						<p class="text-xs font-semibold uppercase tracking-wide" style="color: #7A828D">
							Quick Setup
						</p>
						<p class="text-sm mt-2" style="color: #0D0F12">
							Click the <strong>?</strong> icon in the top-right corner for detailed step-by-step instructions.
						</p>
					</div>

					<!-- Port Info -->
					<div class="mt-4 p-4 rounded-lg text-center" style="background: #FFFFFF; border: 1px solid #DDE3EA">
						<label class="text-xs uppercase tracking-wide mb-1 block" style="color: #7A828D">
							Detected Port
						</label>
						<p class="font-mono text-2xl font-bold" style="color: #0D0F12">
							${port}
						</p>
					</div>

				</div>
			</div>

			<!-- Modal Tutoriel -->
			<div id="tutorialModal" class="modal">
				<div class="max-w-lg w-full mx-4 p-8 rounded-2xl" style="background: #FFFFFF; border: 1px solid #DDE3EA; max-height: 90vh; overflow-y: auto;">
					<!-- Header Modal -->
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-xl font-semibold" style="color: #0D0F12">
							Setup port forwarding
						</h2>
						<button
							id="closeModal"
							style="width: 32px; height: 32px; border-radius: 50%; background: #F7F9FC; border: 1px solid #DDE3EA; color: #7A828D; font-size: 20px; line-height: 1; cursor: pointer;"
						>
							×
						</button>
					</div>

					<!-- Steps -->
					<div class="space-y-6">
						<!-- Step 1 -->
						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: #0D0F12; color: white; font-weight: 600;">
									1
								</div>
							</div>
							<div class="flex-1">
								<h3 class="font-semibold mb-1" style="color: #0D0F12">
									Open the ports panel
								</h3>
								<p class="text-sm" style="color: #7A828D">
									Go to <strong>View → Open view → Ports</strong> or press <code style="background: #F7F9FC; padding: 2px 6px; border-radius: 4px;">Ctrl+Shift+P</code> and type "Ports"
								</p>
							</div>
						</div>

						<!-- Step 2 -->
						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: #0D0F12; color: white; font-weight: 600;">
									2
								</div>
							</div>
							<div class="flex-1">
								<h3 class="font-semibold mb-1" style="color: #0D0F12">
									Forward the port
								</h3>
								<p class="text-sm" style="color: #7A828D">
									Click <strong>"Forward a port"</strong> and enter: <code style="background: #F7F9FC; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${port}</code>
								</p>
							</div>
						</div>

						<!-- Step 3 -->
						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: #0D0F12; color: white; font-weight: 600;">
									3
								</div>
							</div>
							<div class="flex-1">
								<h3 class="font-semibold mb-1" style="color: #0D0F12">
									Set visibility
								</h3>
								<p class="text-sm mb-2" style="color: #7A828D">
									Right-click on the port → <strong>Port visibility</strong> → Choose:
								</p>
								<div class="space-y-2 text-sm">
									<div class="p-3 rounded-lg" style="background: #F7F9FC; border: 1px solid #DDE3EA">
										<strong style="color: #0D0F12">Public:</strong> <span style="color: #7A828D">Anyone with the link can access</span>
									</div>
									<div class="p-3 rounded-lg" style="background: #F7F9FC; border: 1px solid #DDE3EA">
										<strong style="color: #0D0F12">Private:</strong> <span style="color: #7A828D">Requires GitHub authentication (more secure)</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Step 4 -->
						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: #10B981; color: white; font-weight: 600;">
									✓
								</div>
							</div>
							<div class="flex-1">
								<h3 class="font-semibold mb-1" style="color: #0D0F12">
									Restart Mobile Preview
								</h3>
								<p class="text-sm" style="color: #7A828D">
									Run the <strong>Mobile Preview: Start</strong> command again to generate your QR code
								</p>
							</div>
						</div>
					</div>

					<!-- Close Button -->
					<button
						id="closeModalBtn"
						class="w-full mt-6 py-3 px-6 rounded-lg font-medium"
						style="background: #0D0F12; color: white; border: none; cursor: pointer;"
					>
						Got it!
					</button>
				</div>
			</div>

			<script>
				const helpBtn = document.getElementById('helpBtn');
				const modal = document.getElementById('tutorialModal');
				const closeModal = document.getElementById('closeModal');
				const closeModalBtn = document.getElementById('closeModalBtn');

				// Ouvrir le modal
				helpBtn.addEventListener('click', () => {
					modal.classList.add('active');
				});

				// Fermer le modal
				closeModal.addEventListener('click', () => {
					modal.classList.remove('active');
				});

				closeModalBtn.addEventListener('click', () => {
					modal.classList.remove('active');
				});

				// Fermer au clic sur le fond
				modal.addEventListener('click', (e) => {
					if (e.target === modal) {
						modal.classList.remove('active');
					}
				});
			</script>
		</body>
		</html>
	`;
}
