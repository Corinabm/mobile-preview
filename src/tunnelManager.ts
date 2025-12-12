import * as vscode from 'vscode';

/**
 * Crée un tunnel public VS Code pour exposer un port localhost sur internet
 * Utilise l'API vscode.env.asExternalUri() pour créer un tunnel accessible publiquement
 *
 * @param port Numéro du port localhost à exposer
 * @returns URL publique du tunnel (ex: https://xyz.devtunnels.ms) ou null en cas d'erreur
 */
export async function createTunnel(port: number): Promise<string | null> {
	try {
		console.log(`🌐 Création du tunnel pour le port ${port}...`);

		// Création de l'URI locale
		const localUri = vscode.Uri.parse(`http://localhost:${port}`);

		// Utilisation de asExternalUri pour créer un tunnel public
		// VS Code crée automatiquement un tunnel DevTunnels accessible depuis internet
		// Cette API gère automatiquement la configuration (privacy: public, protocol: http)
		const externalUri = await vscode.env.asExternalUri(localUri);

		// Vérification que l'URI externe a été créée avec succès
		if (!externalUri) {
			console.error('❌ Impossible de créer l\'URI externe pour le tunnel');
			return null;
		}

		// Récupération de l'URL publique du tunnel
		// Format: https://xyz.devtunnels.ms ou https://xyz-port.devtunnels.ms
		const publicUrl = externalUri.toString();
		console.log(`✅ Tunnel créé avec succès: ${publicUrl}`);

		return publicUrl;
	} catch (error) {
		// Gestion des erreurs lors de la création du tunnel
		// Erreurs possibles: permissions, réseau, quota DevTunnels dépassé
		console.error('❌ Erreur lors de la création du tunnel:', error);
		console.error('Impossible de créer le tunnel');
		return null;
	}
}
