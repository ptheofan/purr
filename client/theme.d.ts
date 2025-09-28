/// <reference types="react" />
import { PaletteMode, Theme } from '@mui/material';
export declare const tokens: (mode: PaletteMode) => {
    grey: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    primary: {
        100: string;
        200: string;
        300: string;
        400: string;
        450: string;
        500: string;
        550: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950?: undefined;
        1000?: undefined;
    };
    accent1: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    accent2: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    accent3: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
} | {
    grey: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    primary: {
        100: string;
        200: string;
        300: string;
        400: string;
        450: string;
        500: string;
        550: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
        1000: string;
    };
    accent1: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    accent2: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    accent3: {
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
};
export declare const themeSettings: (mode: PaletteMode) => {
    palette: {
        primary: {
            main: string;
        };
        secondary: {
            main: string;
        };
        neutral: {
            dark: string;
            main: string;
            light: string;
        };
        background: {
            default: string;
        };
        mode: PaletteMode;
    };
    typography: {
        fontFamily: string;
        fontSize: number;
        h1: {
            fontFamily: string;
            fontSize: number;
        };
        h2: {
            fontFamily: string;
            fontSize: number;
        };
        h3: {
            fontFamily: string;
            fontSize: number;
        };
        h4: {
            fontFamily: string;
            fontSize: number;
        };
        h5: {
            fontFamily: string;
            fontSize: number;
        };
        h6: {
            fontFamily: string;
            fontSize: number;
        };
    };
};
export declare const ColorModeContext: import("react").Context<{
    toggleColorMode: () => void;
}>;
export declare const useMode: () => [Theme, {
    toggleColorMode: () => void;
}];
