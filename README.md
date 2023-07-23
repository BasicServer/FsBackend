# BasicFsExpress
Add filesystem access via HTTP requests

Frontend functions are available [here](https://github.com/viridian035/BasicFsExpress-Frontend)

## Usage
```TypeScript
import setupFs from 'basic-fs-express';
import Express from 'express';
import Path from 'path';

const App = Express();

setupFs(App, {
    getFilePath(req, path) {
        return Path.join('/path/to/data/', path);
    }
});

/* add routing here */
```

## API

| Method | Action             | Body                          | Content-Type Header | Description                   |
| ------ | ------------------ | ----------------------------- | ------------------- | ----------------------------- |
| GET    | `/file/abc.txt`    | undefined                     | no such header      | Reads the file                |
| GET    | `/dir/abc`         | undefined                     | no such header      | Lists directory contents      |
| PUT    | `/file/abc.txt`    | `{"content": "Hello!"}`       | `application/json`  | Writes the file               |
| PUT    | `/dir/abc`         | undefined                     | no such header      | Creates directory recursively |
| DELETE | `/file/abc`        | undefined                     | no such header      | Deletes the item recursively  |
| POST   | `copyfile`         | `{"src": ..., "dest": ...}`   | `application/json`  | Copies from src to dest    |
| POST   | `movefile`         | `{"src": ..., "dest": ...}`   | `application/json`  | Copies from src to dest    |
