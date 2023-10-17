import React, {
  useState,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import DefaultModal from "./DefaultModal";

export type GlobalModalContext = {
  showModal: (modal: JSX.Element) => void;
  hideModal: () => void;
};

const initalState: GlobalModalContext = {
  showModal: () => {},
  hideModal: () => {},
};

const GlobalModalContext = createContext(initalState);
export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal: React.FC<{}> = ({ children }) => {
  const [modalComponent, setModalComponent] = useState(DefaultModal());

  const showModal = useCallback((modal: JSX.Element) => {
    setModalComponent(modal);
  }, []);

  const hideModal = useCallback(() => {
    setModalComponent(DefaultModal());
  }, []);

  const value = useMemo(
    () => ({ showModal, hideModal }),
    [hideModal, showModal]
  );

  return (
    <GlobalModalContext.Provider value={value}>
      {modalComponent}
      {children}
    </GlobalModalContext.Provider>
  );
};
