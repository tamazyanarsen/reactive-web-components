import { ComponentConfig } from "@shared/types";
import { colorLog } from "../helpers";
import { div } from "../html-fabric";

type RouterConfig = {
    path: string,
    comp: () => ComponentConfig<any>
}[]

const ROUTE_CHANGE_EVENT = 'route-change';

export const routes: RouterConfig = [
    {
        path: '/test',
        comp: () => div('test route')
    }
];

export const linkTo = (path: string, comp: ComponentConfig<any>) => {
    history.pushState({}, '', path);
    comp.addEventlistener('click', () => {
        comp.hostElement.dispatchEvent(new CustomEvent(ROUTE_CHANGE_EVENT, { detail: path }));
    });
}

export const comparePaths = (path1: string, path2: string) => {
    const parts1 = path1.split('/');
    const parts2 = path2.split('/');
    if (parts1.length !== parts2.length) {
        return false;
    }
    return parts1.every((part, index) => {
        const part2 = parts2[index];
        // Если часть начинается с ':', это динамический параметр
        if (part.startsWith(':')) {
            return true; // Любое значение подходит для динамического параметра
        }
        return part === part2;
    });
    // return parts1.every((part, index) => part === parts2[index]);
}

export const routerOutlet = (routes: RouterConfig) => {
    window.addEventListener('popstate', e => {
        console.log('popstate', e)
    })
    const basePath = window.location.pathname;
    colorLog('basePath', basePath);
    const wrapper = div({
        customListeners: {
            [ROUTE_CHANGE_EVENT]: (e: CustomEvent, self) => {
                const path = e.detail as string;
                const normalizedPath = path.startsWith(basePath) ? path.slice(basePath.length) : path;
                colorLog('@gnormalizedPath', normalizedPath);
                const route = routes.find(r => comparePaths(r.path, normalizedPath));
                if (route) {
                    self.set(route.comp());
                }
            }
        },
        style: {
            display: 'contents'
        }
    });

    const route = routes.find(r => comparePaths(r.path, basePath));
    if (route) {
        wrapper.set(route.comp());
    }

    return wrapper;
}