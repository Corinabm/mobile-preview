import * as net from 'net';

// Ports communs de développement à scanner (React, Next.js, Express, Angular, Laravel, Vite, etc.)
const COMMON_PORTS = [3000, 3001, 4000, 4200, 5000, 5173, 5500, 8000, 8080, 9000];

/**
 * Teste si un port spécifique est actif sur localhost
 * @param port Numéro du port à tester
 * @returns true si le port est actif, false sinon
 */
async function isPortActive(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		// Création d'une connexion socket pour tester le port
		const socket = net.createConnection({ port, host: 'localhost' });

		// Timeout de 1 seconde pour éviter les blocages
		socket.setTimeout(1000);

		// Si la connexion réussit, le port est actif
		socket.on('connect', () => {
			socket.destroy();
			resolve(true);
		});

		// Si la connexion échoue ou timeout, le port est inactif
		socket.on('error', () => {
			socket.destroy();
			resolve(false);
		});

		socket.on('timeout', () => {
			socket.destroy();
			resolve(false);
		});
	});
}

/**
 * Détecte automatiquement quel port localhost est actif
 * Teste les ports communs de développement dans l'ordre
 * @returns Le premier port actif trouvé, ou null si aucun port n'est actif
 */
export async function detectActivePort(): Promise<number | null> {
	try {
		// Teste chaque port dans l'ordre
		for (const port of COMMON_PORTS) {
			const active = await isPortActive(port);
			if (active) {
				console.log(`✅ Port actif détecté: ${port}`);
				return port;
			}
		}

		// Aucun port actif trouvé
		console.log('❌ Aucun port actif détecté parmi:', COMMON_PORTS);
		return null;
	} catch (error) {
		// Log les erreurs inattendues
		console.error('Erreur lors de la détection de port:', error);
		return null;
	}
}
