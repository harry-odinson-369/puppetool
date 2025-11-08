import { PageWithCursor } from "./types";
import Utilities from "./utilities";

export default class PageWrapper {
    constructor(page: PageWithCursor, id?: string) {
        this.id = id ?? Utilities.random_number(10000, 999999).toString();
        this.page = page;
    }
    id: string;
    page?: PageWithCursor;
}