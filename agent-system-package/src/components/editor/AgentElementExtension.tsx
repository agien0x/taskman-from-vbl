import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AgentElementNodeView } from './AgentElementNodeView';
import { mergeAttributes } from '@tiptap/core';

export const AgentInputElement = Node.create({
  name: 'agentInput',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      elementId: {
        default: null,
      },
      label: {
        default: null,
      },
      type: {
        default: 'text',
      },
      agentId: {
        default: null,
      },
      agentName: {
        default: null,
      },
      taskId: {
        default: null,
      },
      value: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'agent-input',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            elementId: element.getAttribute('elementid'),
            label: element.getAttribute('label'),
            type: element.getAttribute('type'),
            agentId: element.getAttribute('agentid'),
            agentName: element.getAttribute('agentname'),
            taskId: element.getAttribute('taskid'),
            value: element.getAttribute('value'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['agent-input', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AgentElementNodeView);
  },
});

export const AgentDestinationElement = Node.create({
  name: 'agentDestination',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      elementId: {
        default: null,
      },
      label: {
        default: null,
      },
      type: {
        default: 'text',
      },
      agentId: {
        default: null,
      },
      agentName: {
        default: null,
      },
      taskId: {
        default: null,
      },
      value: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'agent-destination',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            elementId: element.getAttribute('elementid'),
            label: element.getAttribute('label'),
            type: element.getAttribute('type'),
            agentId: element.getAttribute('agentid'),
            agentName: element.getAttribute('agentname'),
            taskId: element.getAttribute('taskid'),
            value: element.getAttribute('value'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['agent-destination', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AgentElementNodeView);
  },
});
