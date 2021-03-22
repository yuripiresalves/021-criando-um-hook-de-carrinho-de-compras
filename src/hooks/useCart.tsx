import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productStock: Stock = (await api.get(`/stock/${productId}`)).data;

      if (cart.filter((product) => product.id === productId).length === 0) {
        const product = (await api.get(`/products/${productId}`)).data;

        setCart([...cart, { ...product, amount: 1 }]);
        window.localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify([...cart, { ...product, amount: 1 }])
        );
      } else {
        const [product] = cart.filter((product) => product.id === productId);

        if (product.amount < productStock.amount) {
          const updatedCart = cart.map((product) => {
            if (product.id === productId) {
              product.amount += 1;
            }
            return product;
          });

          setCart([...updatedCart]);

          window.localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify([...updatedCart])
          );
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.filter((product) => product.id === productId).length === 0) {
        return toast.error('Erro na remoção do produto');
      }
      const filteredCart = cart.filter((product) => product.id !== productId);
      setCart(filteredCart);
      window.localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(filteredCart)
      );
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock: Stock = (await api.get(`/stock/${productId}`)).data;

      if (amount <= 0) return;

      if (amount > productStock.amount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const updatedCart = cart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });

      setCart([...updatedCart]);
      window.localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      );
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
