/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import * as server from 'vscode-ws-jsonrpc/server';
import * as lsp from 'vscode-languageserver';
import { start } from './json-server.js';
import { Message } from 'vscode-languageserver';

export function launch(socket: IWebSocket) {
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);
    const asExternalProccess = process.argv.findIndex(value => value === '--external') !== -1;
    if (asExternalProccess) {
        // start the language server as an external process
        const extJsonServerPath = path.resolve(__dirname, '../dist/ext-json-server.js');
        const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
        const serverConnection = server.createServerProcess('JSON', 'node', [extJsonServerPath]);
        if (serverConnection) {
            server.forward(socketConnection, serverConnection, message => {
                if (Message.isRequest(message)) {
                    if (message.method === lsp.InitializeRequest.type.method) {
                        const initializeParams = message.params as lsp.InitializeParams;
                        initializeParams.processId = process.pid;
                    }
                }
                return message;
            });
        }
    } else {
        // start the language server inside the current process
        start(reader, writer);
    }
}
