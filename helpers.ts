import Express from 'express';
import Fs from 'fs/promises';
import { ExpressFsCfg } from '.';

export function getURLPath<T extends Express.Request>(
	req: T,
	res: Express.Response,
	configuration: ExpressFsCfg<T>,
): string {
	const path = getFullPath(req.path, req, configuration, 1);

	if (path == undefined) {
		res.statusCode = 404;
		res.end();
		throw `filepath undefined`;
	}

	return path;
}

export function getFullPath<T extends Express.Request>(
	path: string,
	req: T,
	configuration: ExpressFsCfg<T>,
	prefixesToRemove: number,
) {
	const pathParts = path
		.split('/')
		.filter((x) => x != '')
		.map((x) => x.replace(/%20/g, ' '));
	pathParts.splice(0, prefixesToRemove);
	const requestedPath = pathParts.join('/');
	return configuration.getFilePath(req as T, requestedPath);
}

export async function copyOrMove<T extends Express.Request>(
	req: T,
	res: Express.Response,
	configuration: ExpressFsCfg<T>,
	shouldMove: boolean,
) {
	try {
		const { src, dest } = req.body;
		const srcPath = getFullPath(src, req as T, configuration, 0);
		const destPath = getFullPath(dest, req as T, configuration, 0);

		if (typeof src != 'string' || typeof dest != 'string') {
			console.warn(`received incomplete copy request`);
			res.statusCode = 400;
			res.end();
		} else if (typeof srcPath != 'string' || typeof destPath != 'string') {
			console.warn(`copy source or dest do not exist`);
			res.statusCode = 404;
			res.end();
		} else {
			if (shouldMove) await Fs.rename(srcPath, destPath);
			else await Fs.cp(srcPath, destPath, { recursive: true });
			res.send('ok');
		}
	} catch (error) {
		console.error(`failed to handle copy request: ${error}`);
		res.statusCode = 500;
		res.end();
	}
}
