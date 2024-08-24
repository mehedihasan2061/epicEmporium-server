const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://epicemporium-e6ce4.web.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};

// middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())



// verify middleware 
const verifyToken = async (req, res, next) => {
  const token = req?.cookies.token
  
  if(!token) return res.status(401).send({ message: "unauthorized access" });

  if (token) {
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded)=>{
      if (err) {
        console.log( err);
        return res.status(401).send({message:'unauthorized access'})
      }
      console.log("decoded Data:=>>",decoded);
      req.user = decoded
      
      next()
    });
  }
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yjkegcv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const productCollection = client.db("epicEmporium").collection("products");
    const featuredCollection = client
      .db("epicEmporium")
      .collection("featuredProduct");
    const recommendCollection = client
      .db("epicEmporium")
      .collection("recommend");
  
    // jwt generate
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ message: true });
    });



    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get("/productQuery/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/products/:email",verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      console.log(tokenEmail);
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { "owner.email": email };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/product/:id", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const options = { upsert: true };
      const productData = req.body;
      console.log(productData);
      const updateDoc = {
        $set: {
          productName: productData.productName,
          productBrand: productData.productBrand,
          productUrl: productData.productUrl,
          queryTitle: productData.queryTitle,
          product_boycott: productData.product_boycott,
          date: productData.data,
        },
      };
      const result = await productCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Recommendation collection

    app.post("/recommend", async (req, res) => {
      const recommendation = req.body;
      // console.log(recommendation);
      const result = await recommendCollection.insertOne(recommendation);
      res.send(result);
    });

    app.get("/my-recommendations/:email",verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await recommendCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/recommend/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await recommendCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/recommendations/:email",verifyToken, async (req, res) => {
      const email = req.params.email;
      //  console.log(email);
      const query = { "owner.email": email };
      const result = await recommendCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/newProduct", async (req, res) => {
      const result = await featuredCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EpicEmporium is comming");
});

app.listen(port, () => {
  console.log(`EpicEmporium is running on port ${port}`);
});
