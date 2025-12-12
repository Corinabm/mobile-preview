import * as QRCode from 'qrcode';

/**
 * Génère un QR code en format base64 à partir d'une URL
 * Utilise la librairie qrcode pour créer une image Data URL
 *
 * @param url URL à encoder dans le QR code (ex: https://xyz-8000.devtunnels.ms)
 * @returns String base64 du QR code (format Data URL) ou null en cas d'erreur
 */
export async function generateQRCode(url: string): Promise<string | null> {
	try {
		console.log(`Génération du QR code pour: ${url}`);

		// Génération du QR code en format Data URL (base64)
		// QRCode.toDataURL() crée une image PNG encodée en base64
		// Format de sortie: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
		const qrCodeDataUrl = await QRCode.toDataURL(url, {
			// Largeur du QR code en pixels (300x300)
			width: 300,

			// Marge autour du QR code (en modules)
			// Une marge de 2 assure une bonne lisibilité
			margin: 2,

			// Couleurs du QR code
			color: {
				dark: '#000',  // Couleur des modules (noir)
				light: '#fff'  // Couleur du fond (blanc)
			}
		});

		console.log('QR code généré avec succès');

		// Le format Data URL est pratique pour la webview car:
		// - Pas besoin de fichier externe
		// - Peut être utilisé directement dans une balise <img src="...">
		// - Intégré dans le HTML de la webview
		return qrCodeDataUrl;
	} catch (error) {
		// Gestion des erreurs lors de la génération
		// Erreurs possibles: URL invalide, problème de mémoire
		console.error('Erreur lors de la génération du QR code:', error);
		console.error('Erreur lors de la génération du QR code');
		return null;
	}
}
