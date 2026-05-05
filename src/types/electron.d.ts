export {};

declare global {
  interface Window {
    cctvDesktop?: {
      platform: string;
      openJsonFile: () => Promise<string | null>;
      saveTextFile: (payload: {
        defaultPath: string;
        content: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<boolean>;
    };
  }
}
