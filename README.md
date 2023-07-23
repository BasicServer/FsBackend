# ExpressFs
Add filesystem access via HTTP requests

## Usage
```TypeScript
import setupFs from 'expressfss';
import Express from 'express';
import Path from 'path';

const App = Express();

setupFs(App, {
    fileUrlPrefix: '/file',
    dirUrlPrefix: '/dir',
    getFilePath(req, path) {
        return Path.join('/path/to/data/', path);
    }
});

/* add routing here */
```

## API
Actions use the configuration above

| Method | Action             | Body                    | Content-Type Header | Description                   |
| ------ | ------------------ | ----------------------- | ------------------- | ----------------------------- |
| GET    | `/file/abc.txt`    | undefined               | no such header      | Reads the file                |
| GET    | `/dir/abc`         | undefined               | no such header      | Lists directory contents      |
| PUT    | `/file/abc.txt`    | `{"content": "Hello!"}` | `application/json`  | Writes the file               |
| PUT    | `/dir/abc`         | undefined               | no such header      | Creates directory recursively |
| DELETE | `/file/abc`        | undefined               | no such header      | Deletes the item recursively  |
