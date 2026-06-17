import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import ToastMessage from './ToastMessage';

const ToastContext = createContext({
  showToast: () => {},
});

export function ToastProvider({ children }) {
  const [activeToast, setActiveToast] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);

  const showToast = useCallback((message) => {
    if (!message) {
      return;
    }

    setToastQueue((currentQueue) => [
      ...currentQueue,
      {
        id: `${Date.now()}-${Math.random()}`,
        message,
      },
    ]);
  }, []);

  const hideToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) {
      return;
    }

    setActiveToast(toastQueue[0]);
    setToastQueue((currentQueue) => currentQueue.slice(1));
  }, [activeToast, toastQueue]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <ToastMessage
          key={activeToast?.id || 'empty-toast'}
          message={activeToast?.message || ''}
          onDismiss={hideToast}
        />
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
