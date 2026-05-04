function Cards(props) {
    return (<div className="w-80 h-60 bg-gray-800 rounded-2xl flex flex-col gap-1">
        <div className="bg-blue-950 flex gap-1.5  w-80 p-2 rounded-2xl ">
        <h1>Title:</h1>
        <h1>{props.title}</h1>
        </div>
        <div className="bg-amber-950 h-full w-80 col-span-8 rounded-2xl">
            <p className="text-2xl p-2">{props.para}</p>
        </div>
        <div className="flex justify-around">
            <button className="border-0 bg-black p-2 w-full rounded-2xl hover:bg-gray-900">del</button>
            <button className="border-0 bg-amber-700 p-2 w-full  rounded-2xl hover:bg-amber-900">edit</button>
        </div>
    </div>)
}
export default Cards;