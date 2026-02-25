import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Currency = "USD" | "UAH";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  UAH: "₴",
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currency, setCurrencyState] = useState<Currency>("USD");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((settings) => {
        if (settings.currency === "USD" || settings.currency === "UAH") {
          setCurrencyState(settings.currency as Currency);
        }
      });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: c }),
    });
  };

  const formatCurrency = (amount: number): string => {
    return `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        currencySymbol: CURRENCY_SYMBOLS[currency],
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
