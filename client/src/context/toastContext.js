import { createContext } from 'react';

/**
 * The toast context. It is kept in its own file so that the provider component and the hook can
 * be imported without pulling a component along.
 */
export const ToastContext = createContext(null);
