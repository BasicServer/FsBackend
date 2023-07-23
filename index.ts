import Express from 'express';
import BodyParser from 'body-parser';
import Fs from 'fs/promises';
import FsNormal from 'fs';
import Path from 'path';

// TYPES
export interface ExpressFsCfg<T extends Express.Request> {
	getFilePath: (req: T, requestedPath: string) => string | undefined;
}

export interface Item {
	name: string;
	isDirectory: boolean;
}

// MAIN
export default function setupFs<T extends Express.Request>(
	expressApp: Express.Express,
	configuration: ExpressFsCfg<T>,
) {
	const bodyParser = BodyParser.json();

	//directories
	expressApp.all('/dir/*', async (req, res, next) => {
		try {
			const dirPath = getURLPath(req as T, res, configuration);

			switch (req.method) {
				case 'GET':
					console.log(`reading directory ${dirPath}`);
					let isDir = true;
					try {
						isDir = (await Fs.stat(dirPath)).isDirectory();
					} catch {
						res.statusCode = 404;
						res.end();
						return;
					}
					if (!isDir) {
						console.warn('cannot read file as directory');
						res.statusCode = 400;
						res.end();
						return;
					}
					const items = await Fs.readdir(dirPath);
					const processedItems: Item[] = [];
					for (let i = 0; i < items.length; i++) {
						const item = items[i];
						const itemPath = Path.join(dirPath, item);
						const isDir = (await Fs.stat(itemPath)).isDirectory();
						processedItems[i] = {
							name: item,
							isDirectory: isDir,
						};
					}

					res.send(JSON.stringify(processedItems, undefined, 4));
					break;
				case 'PUT':
					console.log(`creating directory ${dirPath}`);
					await Fs.mkdir(dirPath, { recursive: true });
					res.statusCode = 201;
					res.send('ok');
					break;
				default:
					console.warn(
						`received directory request using unsupported method ${req.method}`,
					);
					res.statusCode = 400;
					res.end();
			}
		} catch (error) {
			console.error(`failed to handle directory request: ${error}`);
			res.statusCode = 500;
			res.end();
		}
	});

	//files
	expressApp.all('/file/*', bodyParser, async (req, res, next) => {
		try {
			const filePath = getURLPath(req as T, res, configuration);

			switch (req.method) {
				case 'GET':
					console.log(`reading file ${filePath}`);
					let isDir = true;
					try {
						isDir = (await Fs.stat(filePath)).isDirectory();
					} catch {
						res.statusCode = 404;
						res.end();
						return;
					}
					if (isDir) {
						console.warn('cannot read direcoty as file');
						res.statusCode = 400;
						res.end();
						return;
					}
					const stream = FsNormal.createReadStream(filePath);
					stream.on('data', (data) => {
						console.log(data.toString());
						res.send(data.toString());
					});
					break;
				case 'PUT':
					console.log(`writing file ${filePath}`);
					const { content } = req.body;
					if (typeof content != 'string') {
						console.warn(
							`received fs PUT request with no body.content string`,
						);
						res.statusCode = 400;
						res.end();
					} else {
						await Fs.writeFile(filePath, content);
						res.statusCode = 201;
						res.send('ok');
					}
					break;
				case 'DELETE':
					console.log(`deleting item ${filePath}`);
					await Fs.rm(filePath, { recursive: true });
					res.send('ok');
					break;
				default:
					console.warn(
						`received file request using unsupported method ${req.method}`,
					);
					res.statusCode = 400;
					res.end();
			}
		} catch (error) {
			console.error(`failed to handle file request: ${error}`);
			res.statusCode = 500;
			res.end();
		}
	});

	//copy
	expressApp.post('/copyfile', bodyParser, async (req, res, next) => {
		await copyOrMove(req as T, res, configuration, false);
	});

	//move
	expressApp.post('/movefile', bodyParser, async (req, res, next) => {
		await copyOrMove(req as T, res, configuration, true);
	});
}

// UTILITY
function getURLPath<T extends Express.Request>(
	req: T,
	res: Express.Response,
	configuration: ExpressFsCfg<T>,
): string {
	const path = getFullPath(req.path, req, configuration);

	if (path == undefined) {
		res.statusCode = 404;
		res.end();
		throw `filepath undefined`;
	}

	return path;
}

function getFullPath<T extends Express.Request>(
	path: string,
	req: T,
	configuration: ExpressFsCfg<T>,
) {
	const pathParts = path.split('/').filter((x) => x != '');
	pathParts.splice(0, 1);
	const requestedPath = pathParts.join('/');
	return configuration.getFilePath(req as T, requestedPath);
}

async function copyOrMove<T extends Express.Request>(
	req: T,
	res: Express.Response,
	configuration: ExpressFsCfg<T>,
	shouldMove: boolean,
) {
	try {
		const { src, dest } = req.body;
		const srcPath = getFullPath(src, req as T, configuration);
		const destPath = getFullPath(dest, req as T, configuration);

		if (typeof src != 'string' || typeof dest != 'string') {
			console.warn(`received incomplete copy request`);
			res.statusCode = 400;
			res.end();
		} else if (typeof srcPath != 'string' || typeof destPath != 'string') {
			console.warn(`copy source or dest do not exist`);
			res.statusCode = 404;
			res.end();
		} else {
			if (shouldMove) await Fs.rename(src, dest);
			else await Fs.cp(src, dest, { recursive: true });
			res.send('ok');
		}
	} catch (error) {
		console.error(`failed to handle copy request: ${error}`);
		res.statusCode = 500;
		res.end();
	}
}
