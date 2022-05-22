const express = require('express');
const cors = require('cors');
require("dotenv").config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.nzxfx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

console.log(uri)

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization);

    if (!authorization) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
    })

    next();
}


async function run() {
    try {
        await client.connect();
        console.log('Database connected')

        //Database

        const doctorsPortal = client.db('Doctors_portal').collection('services');

        const bookingCollection = client.db('Doctors_portal').collection('bookings');
        const userCollection = client.db('Doctors_portal').collection('user');

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


        app.get('/booking', verifyJWT, async (req, res) => {
            const patientEmail = req.query.patientEmail;
            const decodedEmail = req.decoded;
            console.log(decodedEmail);
            if (patientEmail === decodedEmail.email) {
                const query = { email: patientEmail };
                const result = await bookingCollection.find(query).toArray();
                return res.send(result);
            } else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


        })

        app.get('/users', verifyJWT, async (req, res) => {
            const result = await userCollection.find({}).toArray();
            res.send(result);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email: email });
            const isAdmin = result.role === 'admin';
            res.send({ admin: isAdmin });
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            const requester = req.decoded.email;
            const requestAccount = await userCollection.findOne({ email: requester })
            console.log(requestAccount);
            if (requestAccount.role === 'admin') {
                const query = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(query, updateDoc);
                return res.send(result);
            } else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const body = req.body;
            const filter = { email: email };

            const options = { upsert: true };
            const updateDoc = {
                $set: body,
            };

            const result = await userCollection.updateOne(filter, updateDoc, options);

            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            console.log(token)
            res.send({ result, token })
        });



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