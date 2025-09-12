import { BaseHandler } from "../handlers/base.handler";
import { ChainableHandler } from "../handlers/chainable.handler";

export class ChainableHandlerImpl extends ChainableHandler {
    constructor(handler: BaseHandler) {
        super(handler);
    }
}