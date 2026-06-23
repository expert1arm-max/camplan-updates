export {};

declare global {
  type CctvOpenJsonFileResult = {
    filePath: string;
    content: string;
  };

  type CctvSaveFileResult = {
    ok: boolean;
    filePath?: string;
  };

  type CctvCloseRequestPayload = {
    reason?: string;
  };

  type CctvCloseResponsePayload = {
    hasUnsavedChanges: boolean;
    filePath?: string | null;
    content?: string;
  };

  type CctvCloseResponseResult = {
    state: "closing" | "canceled" | "error" | "closed";
  };

  interface Window {
    cctvDesktop?: {
      platform: string;
      openJsonFile: () => Promise<CctvOpenJsonFileResult | null>;
      openExternal: (url: string) => Promise<boolean>;
      saveTextFile: (payload: {
        defaultPath: string;
        content: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<CctvSaveFileResult>;
      saveBinaryFile: (payload: {
        defaultPath: string;
        dataUrl: string;
        filters: { name: string; extensions: string[] }[];
      }) => Promise<CctvSaveFileResult>;
      onCloseRequest: (callback: (payload: CctvCloseRequestPayload) => void) => () => void;
      respondToCloseRequest: (
        payload: CctvCloseResponsePayload,
      ) => Promise<CctvCloseResponseResult>;
    };
  }
}
