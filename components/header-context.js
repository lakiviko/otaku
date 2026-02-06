"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const HeaderContext = createContext(null);

export function HeaderProvider({ children, initial }) {
  const initialRef = useRef(initial || { eyebrow: "Otaku Catalog", title: "Мои полки" });
  const [header, setHeader] = useState(initialRef.current);

  const value = useMemo(() => ({ header, setHeader }), [header]);

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within HeaderProvider");
  }
  return context;
}

export function PageHeader({ eyebrow, title }) {
  const { setHeader } = useHeader();

  useEffect(() => {
    setHeader({ eyebrow, title });
  }, [eyebrow, title, setHeader]);

  return null;
}
