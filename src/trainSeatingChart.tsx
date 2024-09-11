import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { Tooltip } from 'react-tooltip';

interface Seat {
  id: string;
  sel: boolean;
  booked: boolean;
  price: number;
  type: 'standard' | 'exit';
  r: number;
  c: number;
}

const TrainSeatingChart: React.FC = () => {
  const rows = 13;
  const cols = 7;
  const max = 7;

  const [seats, setSeats] = useState<Seat[]>([]);
  const [price, setPrice] = useState(0);
  const [num, setNum] = useState(1); 
  const [name, setName] = useState('');  
  const [email, setEmail] = useState('');  
  const [loading, setLoading] = useState(false); 

  const initSeats = async (): Promise<Seat[]> => {
    const data: Seat[] = [];
    const snap = await getDocs(collection(db, 'seats'));
    snap.forEach((doc) => {
      const item = doc.data();
      const [r, c] = item.id.split('-').map(Number);
      data.push({
        id: item.id,
        sel: false,
        booked: item.booked || false,
        price: r === 4 ? 380 : 130,
        type: r === 4 ? 'exit' : 'standard',
        r,
        c,
      });
    });
    return data;
  };

  useEffect(() => {
    const getSeats = async () => {
      const init = await initSeats();
      setSeats(init);
    };
    getSeats();
  }, []);

  useEffect(() => {
    autoSelect();
  }, [num]);

  const getSelected = () => seats.filter((s) => s.sel);

  const autoSelect = () => {
    const n = Math.min(num, max);
    let picked: Seat[] = [];

    const findBlock = (avail: Seat[]): Seat[] => {
      const sorted = avail.sort((a, b) => {
        if (a.r === b.r) return a.c - b.c;
        return a.r - b.r;
      });

      let best: Seat[] = [];
      let cur: Seat[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const p = cur[cur.length - 1];

        if (!p || (s.r === p.r && s.c === p.c + 1) || (s.r === p.r + 1 && s.c === 1)) {
          cur.push(s);
        } else {
          if (cur.length > best.length) {
            best = [...cur];
          }
          cur = [s];
        }
      }

      if (cur.length > best.length) {
        best = cur;
      }

      return best.slice(0, n);
    };

    const avail = seats.filter((s) => !s.booked);
    picked = findBlock(avail);

    if (picked.length < n) {
      const rest = avail
        .filter((s) => !picked.some((p) => p.id === s.id))
        .sort((a, b) => {
          const last = picked[picked.length - 1];
          const da = Math.abs(a.r - last.r) + Math.abs(a.c - last.c);
          const db = Math.abs(b.r - last.r) + Math.abs(b.c - last.c);
          return da - db;
        });

      picked = [...picked, ...rest.slice(0, n - picked.length)];
    }

    const newSeats = seats.map((s) => ({
      ...s,
      sel: picked.some((p) => p.id === s.id),
    }));

    setSeats(newSeats);
    setPrice(picked.reduce((t, s) => t + s.price, 0));
  };

  const clickSeat = (id: string) => {
    const s = seats.find((s) => s.id === id);

    if (!s) return;

    if (s.booked) {
      alert(`Seat ${id} is already booked.`);
      return;
    }

    const sel = getSelected();

    if (!s.sel && sel.length >= max) {
      alert(`Max ${max} seats allowed.`);
      return;
    }

    const newSeats = seats.map((seat) =>
      seat.id === id ? { ...seat, sel: !seat.sel } : seat
    );

    setSeats(newSeats);
    setPrice(newSeats.filter((s) => s.sel).reduce((t, s) => t + s.price, 0));
  };

  const book = async () => {
    const sel = getSelected();
    if (sel.length === 0) {
      alert('Select seats to book.');
      return;
    }

    if (sel.length > max) {
      alert(`Max ${max} seats allowed.`);
      return;
    }

    if (!name || !email) {
      alert('Please enter your name and email.');
      return;
    }

    setLoading(true);

    const ids = sel.map((s) => s.id);
    const unavail: string[] = [];

    const q = query(
      collection(db, 'seats'),
      where('id', 'in', ids),
      where('booked', '==', true)
    );
    const snap = await getDocs(q);

    snap.forEach((doc) => {
      unavail.push(doc.id);
    });

    if (unavail.length > 0) {
      alert(`Seats already booked: ${unavail.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      await Promise.all(
        sel.map(async (s) => {
          const ref = doc(db, 'seats', s.id);
          await updateDoc(ref, { booked: true });
        })
      );

      await addDoc(collection(db, 'bookings'), {
        seats: ids,
        price,
        name,
        email,
        time: new Date().toISOString(),
      });

      alert(`Booking confirmed for ${name} (${email}). Seats: ${ids.join(', ')}`);

      setLoading(false); 
      window.location.reload();
    } catch (error) {
      console.error('Booking error: ', error);
      alert('Booking failed. Try again.');
      setLoading(false);
    }
  };

  const seatColor = (s: Seat) => {
    if (s.booked) return 'bg-gray-500';
    if (s.sel) return 'bg-green-500';
    if (s.type === 'exit') return 'bg-purple-300';
    return 'bg-blue-300';
  };

  return (
    <div className="p-8 bg-gray-100 font-sans relative">
      <h1 className="text-3xl font-bold mb-6 text-center">Train Seat Reservation</h1>
      <div className="mb-6 text-center">
        <label className="block mb-2">Name:</label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-md mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
        <label className="block mb-2">Email:</label>
        <input
          type="email"
          className="p-2 border border-gray-300 rounded-md"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      {/* Number of seats dropdown */}
      <div className="mb-6 flex justify-center items-center">
        <label htmlFor="numSeats" className="mr-2 text-lg">
          Number of seats:
        </label>
        <select
          id="numSeats"
          value={num}
          onChange={(e) => setNum(parseInt(e.target.value))}
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Seat selection */}
      <div className="train-coach bg-white p-6 rounded-lg shadow-lg">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex justify-center mb-2">
            {Array.from({ length: r === rows - 1 ? 3 : cols }).map((_, c) => {
              const id = `${r + 1}-${c + 1}`;
              const s = seats.find((seat) => seat.id === id);

              if (!s) return null;

              return (
                <div
                  key={id}
                  className={`w-12 h-12 m-1 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-200 ${seatColor(s)} hover:scale-110 hover:shadow-lg`}
                  onClick={() => clickSeat(id)}
                  data-tooltip-id="seat-tooltip"
                  data-tooltip-content={s.booked ? 'Seat already booked' : `Price: ₹${s.price}`}
                >
                  <span className="text-white">{id}</span>
                </div>
              );
            })}
          </div>
        ))}
        <Tooltip id="seat-tooltip" place="top" />
      </div>

      {/* Booking section */}
      <div className="mt-6 text-center">
        <p className="text-xl font-semibold mb-4">
          Total price: ₹{price.toLocaleString('en-IN')}
        </p>
        <button
          onClick={book}
          className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={loading}
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>

        {loading && (
          <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainSeatingChart;
