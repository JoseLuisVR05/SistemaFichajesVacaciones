import { useState } from 'react';

export const useDialogState = () => {
  const [dialogs, setDialogs] = useState({
    create: false,
    edit: null,
    reject: null,
    delete: null,
    detail: null,
  });

  const setDialog = (name, value) => {
    setDialogs(prev => ({ ...prev, [name]: value }));
  };

  return { dialogs, setDialog };
};