import { ReactNode } from 'react';
interface LeftbarStateContextProps {
    isCollapsed: boolean;
    setCollapsed: (value: boolean) => void;
}
export declare const LeftbarStateContext: import("react").Context<LeftbarStateContextProps>;
interface LeftbarProviderProps {
    children: ReactNode;
}
export declare const LeftbarProvider: ({ children }: LeftbarProviderProps) => import("react/jsx-runtime").JSX.Element;
type TSetCollapsed = (value: boolean) => void;
export declare const useLeftbar: () => [boolean, TSetCollapsed];
declare const Leftbar: () => import("react/jsx-runtime").JSX.Element;
export default Leftbar;
