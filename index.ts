import BodyParser from 'body-parser';
import Express from 'express';
import Fs from 'fs/promises';
import Path from 'path';
import { getURLPath } from './helpers';
import { copyOrMove } from './helpers';

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

					res.sendFile(filePath);
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
