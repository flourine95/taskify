import {Droppable} from '@hello-pangea/dnd';
import {Task} from './Task';
import type {Column as ColumnType, Task as TaskType} from '@/types';

interface ColumnProps {
    column: ColumnType;
    onTaskEdit: (task: TaskType) => void;
    onTaskMarkComplete: (taskId: string) => void;
    onTaskMarkInProgress: (taskId: string) => void;
}

export function Column({column, onTaskEdit, onTaskMarkComplete, onTaskMarkInProgress}: ColumnProps) {
    return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h2 className="font-semibold mb-4">{column.title}</h2>
            <Droppable droppableId={column.id}>
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2"
                    >
                        {column.tasks.map((task, index) => (
                            <Task
                                key={task.id}
                                task={task}
                                index={index}
                                onEdit={onTaskEdit}
                                onMarkComplete={onTaskMarkComplete}
                                onMarkInProgress={onTaskMarkInProgress}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
