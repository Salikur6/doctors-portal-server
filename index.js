const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.nzxfx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

console.log(uri)

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        console.log('Database connected')

        //Database

        const doctorsPortal = client.db('Doctors_portal').collection('services');

        const bookingCollection = client.db('Doctors_portal').collection('bookings');


        app.get('/service', async (req, res) => {
            const query = {}
            const cursor = doctorsPortal.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/available', async (req, res) => {
            const date = req.query.date;

            const services = await doctorsPortal.find().toArray();

            const query = { bookingDate: date };
            // console.log(date)
            const bookings = await bookingCollection.find(query).toArray();

            services.forEach(service => {
                const serviceBooking = bookings.filter(book => book.treatmentName === service.name);

                const bookedSlots = serviceBooking.map(book => book.slot);

                const availableSlots = service.slots.filter(slot => !bookedSlots.includes(slot))
                service.slots = availableSlots;
                // console.log(services)
            })
            res.send(services);
        })



        // post Api

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            // console.log(data)
            const query = { treatmentName: booking.treatmentName, bookingDate: booking.bookingDate, email: booking.email }

            const exists = await bookingCollection.findOne(query);

            if (exists) {
                return res.send({ success: false, data: exists })
            } else {

                const result = await bookingCollection.insertOne(booking);
                return res.send({ success: true, result });

            }
        })

    }
    finally {

    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('All ok')
})



app.listen(port, () => {
    console.log('Listening Port', port)
})