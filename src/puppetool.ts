import { BrowserConnectResult, BrowserLaunchOptions, PageWithCursor, ProxyOptions } from "./types";
import BrowserHelper from "./browser";
import PageWrapper from "./wrapper";
import { Page, Browser } from "rebrowser-puppeteer-core";
import CursorPage from "./page";

export { type PageWithCursor, Browser, Page, type BrowserConnectResult, type BrowserLaunchOptions, type ProxyOptions }

export default class Puppetool {
    private constructor() { }
    private static _instance = new Puppetool();
    static get instance() { return this._instance; }

    setMaxConcurrentPages(max: number) {
        if (max > 0) this.maxConcurrentPages = max;
    }

    maxConcurrentPages = 150;
    options: BrowserLaunchOptions = { connectOption: { defaultViewport: null } };
    connection: BrowserConnectResult | undefined;
    pages: PageWrapper[] = [];

    async closeById(id: string) {
        const index = this.pages.findIndex(e => e.id === id);
        if (index !== -1) {
            await this.pages[index].page?.close().catch(() => { });
            this.pages.splice(index, 1);
        }
    }

    async getPage(props?: { turnstile?: boolean, fresh?: boolean, id?: string }): Promise<PageWithCursor | undefined> {
        if (!this.connection) this.connection = await new BrowserHelper().connect(this.options);
        if (this.pages.length >= this.maxConcurrentPages) await this.waitForFreeSlot();
        let page: Page | undefined;
        if (props?.fresh === true) {
            try {
                const newContext = await this.connection.browser.createBrowserContext();
                page = await newContext.newPage();
                page.on("close", async () => {
                    await newContext.close().catch(() => { });
                });
            } catch { }
        } else {
            try { page = await this.connection.browser.newPage(); } catch { }
        }
        if (!page) return undefined;
        const pagewithcursor = await CursorPage.create({ ...this.connection, page, turnstile: props?.turnstile });
        const wrapped = new PageWrapper(pagewithcursor, props?.id);
        pagewithcursor.on("close", async () => {
            const index = this.pages.findIndex(e => e.id === wrapped.id);
            if (index !== -1) {
                await this.pages[index].page?.close().catch(() => { });
                this.pages.splice(index, 1);
            }
        });
        this.pages.push(wrapped);
        return pagewithcursor;
    }

    private async waitForFreeSlot(): Promise<void> {
        while (this.pages.length >= this.maxConcurrentPages) {
            await new Promise(res => setTimeout(res, 100));
        }
    }
}