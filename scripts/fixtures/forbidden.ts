// A fixture of the forbidden-import gate: each line must be refused.
import type { Kernel } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';
import '@jupyter/web-components';
import { Notebook } from '@datalayer/jupyter-react';
import { useUser } from '@datalayer/core';
import { ChatView } from '@datalayer/agent-runtimes';
import { Button } from '@primer/react';
import { createRoot } from 'react-dom/client';
import './styles.css';
export { Signal } from '@lumino/signaling';
const lazy = () => import('@jupyterlab/notebook');
const required = require('@jupyter/ydoc');
const stored = localStorage.getItem('token');
