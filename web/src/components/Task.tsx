import {Draggable} from '@hello-pangea/dnd';
import type {Task as TaskType} from '@/types';
import {cn} from '@/lib/utils';
import {MoreVertical} from 'lucide-react';

interface TaskProps {
    task: TaskType;
    index: number;
    onEdit: (task: TaskType) => void;
    onMarkComplete: (taskId: string) => void;
    onMarkInProgress: (taskId: string) => void;
}

export function Task({task, index, onEdit, onMarkComplete, onMarkInProgress}: TaskProps) {
    const priorityColors = {
        low: 'bg-green-100 text-green-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-red-100 text-red-800'
    };

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm group"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="font-medium mb-2">{task.title}</h3>
                        <button
                            onClick={() => onEdit(task)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical className="w-4 h-4"/>
                        </button>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {task.description}
                        </p>
                    )}

                    <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        priorityColors[task.priority]
                    )}>
            {task.priority}
          </span>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <p>🕒 Tạo: {task.createdAt && new Date(task.createdAt).toLocaleString()}</p>
                        {task.startedAt && <p>🔄 Xử lý: {new Date(task.startedAt).toLocaleString()}</p>}
                        {task.completedAt && <p>✅ Hoàn thành: {new Date(task.completedAt).toLocaleString()}</p>}
                    </div>
                    {/*6.1 Khi user nhấn nút "✔ Hoàn thành"*/}
                    {task.status === 'in-progress' && (
                        <button
                            onClick={() => {
                                if (window.confirm('Bạn có chắc chắn muốn đánh dấu là Hoàn thành?')) {
                                    onMarkComplete(task.id);
                                }
                            }}
                            className="mt-3 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 rounded-md transition-colors duration-200"
                        >
                            ✔ Hoàn thành
                        </button>
                    )}
                    {/* Nếu đang ở trạng thái cần làm thì hiển thị nút chuyển sang "Đang xử lý" */}
                    {task.status === 'todo' && (
                        <button
                            onClick={() => {
                                if (window.confirm('Chuyển công việc sang trạng thái "Đang xử lý"?')) {
                                    onMarkInProgress(task.id);
                                }
                            }}

                            className="mt-3 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md transition-colors duration-200"
                        >
                            → Đang xử lý
                        </button>
                    )}


                </div>
            )}
        </Draggable>
    );
}
