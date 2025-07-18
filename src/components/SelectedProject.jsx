/**
 * Project Object
 * @param {*} param0
 * @returns
 */
export default function SelectedProject({ project }) {
  const formattedDate = new Date(project.dueDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="w-[35rem] mt-16">
      {/**  */}
      <header className="pb-4 mb-4 boarder-b-2 boarder-stone-300">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-stone-600 mb-2">
            {project.title}
          </h1>
          <button className="text-stone-600 hover:text-stone-950">削除</button>
        </div>
        <p className="mb-4 text-stone-400">{formattedDate}</p>
        <p className="text-stone-600 whitespace-pre-wrap">
          {project.description}
        </p>
      </header>
    </div>
  );
}
