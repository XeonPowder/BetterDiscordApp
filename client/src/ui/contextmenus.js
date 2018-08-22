/*
 * BetterDiscord Context Menus
 * Copyright (c) 2015-present Jiiks/JsSucks - https://github.com/Jiiks / https://github.com/JsSucks
 * All rights reserved.
 * https://betterdiscord.net
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
*/

import { ReactComponents, WebpackModules, MonkeyPatch } from 'modules';
import { VueInjector, Toasts } from 'ui';
import CMGroup from './components/contextmenu/Group.vue';

export class BdContextMenu {

    /**
     * Show a context menu
     * @param {MouseEvent|Object} e MouseEvent or Object { x: 0, y: 0 }
     * @param {Object[]} grops Groups of items to show in context menu
     */
    static show(e, groups) {
        const x = e.x || e.clientX;
        const y = e.y || e.clientY;
        this.activeMenu.menu = { x, y, groups };
    }

    static get activeMenu() {
        return this._activeMenu || (this._activeMenu = { menu: null });
    }

}

export class DiscordContextMenu {

    static add(target, groups) {
        if (!this.patched) this.patch();
        this.menus.push({ target, groups });
    }

    static get menus() {
        return this._menus || (this._menus = []);
    }

    static async patch() {
        if (this.patched) return;
        this.patched = true;
        const self = this;
        MonkeyPatch('BD:DiscordCMOCM', WebpackModules.getModuleByProps(['openContextMenu'])).instead('openContextMenu', (_, [e, fn], originalFn) => {
            const overrideFn = function (...args) {
                const res = fn(...args);
                if (!res.hasOwnProperty('type')) return res;
                if (!res.type.prototype || !res.type.prototype.render || res.type.prototype.render.__patched) return res;
                MonkeyPatch('BD:DiscordCMRender', res.type.prototype).after('render', (c, a, r) => self.renderCm(c, a, r, res));
                res.type.prototype.render.__patched = true;
                return res;
            }
            return originalFn(e, overrideFn);
        });
    }

    static renderCm(component, args, retVal, res) {
        if (!retVal.props || !res.props) return;
        const { target } = res.props;
        const { top, left } = retVal.props.style;
        if (!target || !top || !left) return;
        if (!retVal.props.children) return;
        if (!(retVal.props.children instanceof Array)) retVal.props.children = [retVal.props.children];
        for (const menu of this.menus.filter(menu => menu.target(target))) {
            retVal.props.children.push(VueInjector.createReactElement(CMGroup, {
                top,
                left,
                closeMenu: () => WebpackModules.getModuleByProps(['closeContextMenu']).closeContextMenu(),
                items: menu.groups
            }));
        }
    }

}