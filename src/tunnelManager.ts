import { install, bin } from 'cloudflared';
import { spawn } from 'child_process';

/**
 * Crée un tunnel public Cloudflare pour exposer un port localhost sur internet
 * Utilise Cloudflare Tunnel (cloudflared) pour créer un tunnel HTTPS sécurisé
 *
 * @param port Numéro du port localhost à exposer
 * @returns URL publique du tunnel (ex: https://xyz.trycloudflare.com) ou null en cas d'erreur
 */
export async function createTunnel(port: number): Promise<string | null> {
	try {
		console.log(`🌐 Création du tunnel Cloudflare pour le port ${port}...`);
		console.log(`⏳ Installation de cloudflared si nécessaire (cela peut prendre 1-2 minutes la première fois)...`);

		// Installation de cloudflared si nécessaire
		// Cette étape télécharge le binaire cloudflared la première fois uniquement
		await install(bin);
		console.log(`✅ cloudflared prêt`);

		// Création du tunnel Cloudflare
		// --url : Port localhost à exposer
		// --no-autoupdate : Désactive les mises à jour automatiques
		// Format de sortie : "Your quick tunnel is available at https://xyz.trycloudflare.com"
		return new Promise((resolve, reject) => {
			console.log(`🚀 Démarrage du tunnel Cloudflare...`);

			const cloudflaredProcess = spawn(bin, [
				'tunnel',
				'--url', `http://localhost:${port}`,
				'--no-autoupdate'
			]);

			let tunnelUrl: string | null = null;
			let hasResolved = false;

			// Écouter la sortie stdout pour extraire l'URL du tunnel
			cloudflaredProcess.stdout.on('data', (data: Buffer) => {
				const output = data.toString();
				console.log(`[cloudflared stdout] ${output.trim()}`);

				// Rechercher l'URL du tunnel
				// Formats possibles:
				// - "https://xyz.trycloudflare.com"
				// - "Your quick Tunnel has been created! Visit it at: https://xyz.trycloudflare.com"
				const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
				if (urlMatch && !hasResolved) {
					tunnelUrl = urlMatch[0];
					hasResolved = true;

					console.log(`✅ Tunnel Cloudflare créé avec succès: ${tunnelUrl}`);
					console.log(`📌 Le tunnel restera actif jusqu'à la fermeture de l'extension`);
					console.log(`🔒 Sécurisé par l'infrastructure Cloudflare (chiffrement HTTPS)`);

					resolve(tunnelUrl);
				}
			});

			// Écouter stderr (cloudflared envoie beaucoup de logs dans stderr)
			cloudflaredProcess.stderr.on('data', (data: Buffer) => {
				const output = data.toString();

				// Rechercher l'URL du tunnel dans stderr aussi
				// Cloudflare peut afficher l'URL dans stderr avec les messages INFO
				const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
				if (urlMatch && !hasResolved) {
					tunnelUrl = urlMatch[0];
					hasResolved = true;

					console.log(`✅ Tunnel Cloudflare créé avec succès: ${tunnelUrl}`);
					console.log(`📌 Le tunnel restera actif jusqu'à la fermeture de l'extension`);
					console.log(`🔒 Sécurisé par l'infrastructure Cloudflare (chiffrement HTTPS)`);

					resolve(tunnelUrl);
					return;
				}

				// Afficher les logs stderr pour debugging
				console.log(`[cloudflared stderr] ${output.trim()}`);
			});

			// Gestion de la fermeture du processus
			cloudflaredProcess.on('close', (code: number | null) => {
				console.log(`🔒 Tunnel Cloudflare fermé (code: ${code})`);
				if (!hasResolved) {
					reject(new Error(`cloudflared s'est arrêté avant de créer le tunnel (code: ${code})`));
				}
			});

			// Gestion des erreurs du processus
			cloudflaredProcess.on('error', (err: Error) => {
				console.error(`❌ Erreur du processus cloudflared:`, err);
				if (!hasResolved) {
					reject(err);
				}
			});

			// Timeout après 60 secondes si aucun tunnel n'est créé
			setTimeout(() => {
				if (!hasResolved) {
					cloudflaredProcess.kill();
					reject(new Error('Timeout: Le tunnel Cloudflare n\'a pas pu être créé dans les 60 secondes'));
				}
			}, 60000);
		});

	} catch (error) {
		// Gestion des erreurs lors de la création du tunnel
		// Erreurs possibles:
		// - Impossible de télécharger cloudflared
		// - Problème réseau (pas de connexion internet)
		// - Port déjà utilisé
		// - Quota Cloudflare dépassé (très rare en usage gratuit)
		console.error('❌ Erreur lors de la création du tunnel Cloudflare:', error);

		// Message d'aide selon le type d'erreur
		if (error instanceof Error) {
			if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
				console.error('💡 Vérifiez votre connexion internet');
			} else if (error.message.includes('EADDRINUSE')) {
				console.error('💡 Le port est déjà utilisé par un autre service');
			} else if (error.message.includes('Timeout')) {
				console.error('💡 La création du tunnel a pris trop de temps - vérifiez votre connexion');
			}
		}

		return null;
	}
}
