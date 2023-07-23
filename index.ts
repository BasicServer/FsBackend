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
			const dirPath = getFilePath(req as T, res, configuration);

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
			const filePath = getFilePath(req as T, res, configuration);

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
		try {
			const { src, dest } = req.body;
			if (typeof src != 'string' || typeof dest != 'string') {
				console.warn(`received incomplete copy request`);
				res.statusCode = 400;
				res.end();
			} else {
				await Fs.cp(src, dest, { recursive: true });
				res.send('ok');
			}
		} catch (error) {
			console.error(`failed to handle copy request: ${error}`);
			res.statusCode = 500;
			res.end();
		}
	});

	//move
	expressApp.post('/movefile', bodyParser, async (req, res, next) => {
		try {
			const { src, dest } = req.body;
			if (typeof src != 'string' || typeof dest != 'string') {
				console.warn(`received incomplete copy request`);
				res.statusCode = 400;
				res.end();
			} else {
				await Fs.rename(src, dest);
				res.send('ok');
			}
		} catch (error) {
			console.error(`failed to handle copy request: ${error}`);
			res.statusCode = 500;
			res.end();
		}
	});
}

// UTILITY
function getFilePath<T extends Express.Request>(
	req: T,
	res: Express.Response,
	configuration: ExpressFsCfg<T>,
): string {
	const pathParts = req.path.split('/').filter((x) => x != '');
	pathParts.splice(0, 1);
	const requestedPath = pathParts.join('/');
	const filePath = configuration.getFilePath(req as T, requestedPath);

	if (filePath == undefined) {
		res.statusCode = 404;
		res.end();
		throw `filepath undefined`;
	}

	return filePath;
}
