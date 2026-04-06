import { createContext, useContext, useReducer, type Dispatch } from "react";

type StatusMessage = {
  successMessage: string | null;
  errorMessage: string | null;
};

type StatusMessageAction = { type: "setSuccess"; message: string | null } | { type: "setError"; message: string | null } | { type: "clear" };

const StatusMessageStateContext = createContext<StatusMessage | null>(null);
const StatusMessageDispatchContext = createContext<Dispatch<StatusMessageAction> | null>(null);

export const useStatusMessageState = () => {
  const context = useContext(StatusMessageStateContext);
  if (!context) {
    throw new Error("useStatusMessageState must be used within StatusMessageProvider");
  }
  return context;
};

export const useStatusMessageDispatch = () => {
  const context = useContext(StatusMessageDispatchContext);
  if (!context) {
    throw new Error("useStatusMessageDispatch must be used within StatusMessageProvider");
  }
  return context;
};

export function StatusMessageProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(statusMessageReducer, {
    successMessage: null,
    errorMessage: null,
  });

  return (
    <StatusMessageDispatchContext.Provider value={dispatch}>
      <StatusMessageStateContext.Provider value={state}>{children}</StatusMessageStateContext.Provider>
    </StatusMessageDispatchContext.Provider>
  );
}

function statusMessageReducer(state: StatusMessage, action: StatusMessageAction): StatusMessage {
  switch (action.type) {
    case "setSuccess":
      return { successMessage: action.message, errorMessage: null };
    case "setError":
      return { successMessage: null, errorMessage: action.message };
    case "clear":
      return { successMessage: null, errorMessage: null };
    default:
      return state;
  }
}
