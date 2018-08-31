/// <reference types="node" />
import * as child from 'child_process';
import * as EventEmitter from 'events';
import * as readline from 'readline';
export declare type MenuItem = {
    title: string;
    tooltip: string;
    checked: boolean;
    enabled: boolean;
};
export declare type Menu = {
    icon: string;
    title: string;
    tooltip: string;
    items: MenuItem[];
};
export declare type ClickEvent = {
    type: 'clicked';
    item: MenuItem;
    seq_id: number;
};
export declare type ReadyEvent = {
    type: 'ready';
};
export declare type Event = ClickEvent | ReadyEvent;
export declare type UpdateItemAction = {
    type: 'update-item';
    item: MenuItem;
    seq_id: number;
};
export declare type UpdateMenuAction = {
    type: 'update-menu';
    menu: Menu;
    seq_id: number;
};
export declare type UpdateMenuAndItemAction = {
    type: 'update-menu-and-item';
    menu: Menu;
    item: MenuItem;
    seq_id: number;
};
export declare type Action = UpdateItemAction | UpdateMenuAction | UpdateMenuAndItemAction;
export declare type Conf = {
    menu: Menu;
};
export default class SysTray extends EventEmitter {
    protected _conf: Conf;
    protected _helper: child.ChildProcess;
    protected _helperPath: string;
    protected _rl: readline.ReadLine;
    constructor(conf: Conf);
    onReady(listener: () => void): this;
    onClick(listener: (action: ClickEvent) => void): this;
    writeLine(line: string): this;
    sendAction(action: Action): this;
    /**
     * Kill the systray process
     * @param exitNode Exit current node process after systray process is killed, default is true
     */
    kill(exitNode?: boolean): void;
    onExit(listener: (code: number | null, signal: string | null) => void): void;
    onError(listener: (err: Error) => void): void;
    readonly killed: boolean;
    readonly helperPath: string;
}
