export {};

declare global {
  interface Window {
    cctvDesktop?: {
      platform: string;
      openJsonFile: () => Promise<string | null>;
      openExternal: (url: string) => Promise<boolean>;
      saveTextFile: (payload: {
        defaultPath: string;
        content: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<boolean>;
    };
  }
}
