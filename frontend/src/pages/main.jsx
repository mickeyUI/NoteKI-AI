import Cards from "../components/cards"
import { useEffect, useState } from "react"
function Main() {
    const [notes, setNotes] = useState([]);
    const [question, setQuestion] = useState("");
    const [response, setResponse] = useState("");

    const fetchNotes = async () => {
      const res = await fetch("http://127.0.0.1:8000/GetNotes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok) {
      setNotes(data);
    } else {
      alert(data.detail);
    }
    };
    useEffect(() => {
        fetchNotes();
    }, [])
    return (
        <div className="flex justify-center items-center content-center center ">
        <div className="container border-2 border-amber-50 w-auto bg-gray-800 rounded-2xl flex flex-col mt-20 ">
            <div className="justify-center flex ">
            <h1 className="text-white text-2xl">Notes</h1>

            </div>
            <div className="bg-gray-900 grid grid-cols-3 gap-5 p-5 rounded-2xl h-[540px] overflow-scroll">
                {notes.map((note, index) => (
                    <Cards key={index} title={note.title} para={note.content} />
                ))}

                <div className=" bg-black col-span-3 h-60">
                      <p className="text-2xl p-5 font-extralight">{response}</p>
                </div>
                
            </div>
            <div className="flex justify-center gap-5 p-4">
            <input className="bg-gray-500 rounded-2xl w-full p-2 text-2xl" type="text" placeholder="ask any question about your notes"
            value={question}
            onChange={e => setQuestion(e.target.value)}/>
            <button className="text-white border-2 rounded-2xl bg-blue-700 pl-9 pr-9 hover:border-blue-800"
            onClick={}>ASK</button>
            </div>
        </div>
        </div>
    )
}

export default Main;