export type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
};

export type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

export type Board = {
  columns: Column[];
}; 