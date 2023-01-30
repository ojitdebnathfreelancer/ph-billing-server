const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('ph billing server running')
});


const jwtVerify = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send({ message: "You have not access token" })
    }
    const Mtoken = token.split(' ')[1];
    jwt.verify(Mtoken, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(403).send({ message: error.message })
        }
        req.decoded = decoded;
        next()
    })
};
// jwt verification 


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.r7d25w3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const phBill = async () => {
    try {
        const usersData = client.db('phBilling').collection('users');
        const billsData = client.db('phBilling').collection('bills');

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ token });
        });
        // jwt sign with frontend 

        app.post('/registration', async (req, res) => {
            const user = req.body;

            const query = { email: user.email };
            const exist = await usersData.findOne(query);
            if (exist) {
                return res.send({ message: "Email alreday exist" })
            };

            const added = await usersData.insertOne(user);
            res.send(added);
        });
        // user register with JWT 

        app.post('/login', async (req, res) => {
            const user = req.body;
            const query = { email: user.email, password: user.password };
            const correct = await usersData.findOne(query);

            if (!correct) {
                return res.send({ message: 'user not found' })
            }
            res.send(correct)
        });
        // user login 

        app.post('/add-billing', jwtVerify, async (req, res) => {
            const bill = req.body;
            const added = await billsData.insertOne(bill);
            res.send(added);
        });
        // add billing to DB 

        app.get('/billing-list', jwtVerify, async (req, res) => {
            const keyword = req.query.keyword;
            const page = parseInt(req.query?.page);
            const size = parseInt(req.query?.size);

            const bills = await billsData.find({}).skip(page * size).limit(size).toArray();
            const copayBills = bills;
            const totalBill = await billsData.estimatedDocumentCount();

            if (keyword) {
                let bills = copayBills.filter((data) =>
                    data.name.toLowerCase().includes(keyword.toLocaleLowerCase()) ||
                    data.email.toLowerCase().includes(keyword.toLocaleLowerCase()) ||
                    data.phone.toLowerCase().includes(keyword.toLocaleLowerCase())
                );
                return res.send({ bills, totalBill });
            }
            res.send({ bills, totalBill });
        });
        // get all billing from DB

        app.patch('/update-billing/:id', jwtVerify, async (req, res) => {
            const bill = req.body;
            const id = req.params.id;
            const fillter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    name: bill.name,
                    email: bill.email,
                    phone: bill.phone,
                    billAmount: bill.billAmount
                }
            };
            const update = await billsData.updateOne(fillter, updatedDoc, options);
            res.send(update)
        });
        // update bill from DB

        app.get('/delete-billing/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deleted = await billsData.deleteOne(query);
            res.send(deleted);
        });
        // delete bill from DB

    }
    finally {

    }
}
phBill().catch(error => console.log(error));



app.listen(port, () => {
    console.log('server is running')
})