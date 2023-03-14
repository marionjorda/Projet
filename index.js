require("dotenv").config();

const { MongoClient } = require("mongodb");
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = process.env.MONGO_URI;
const client = new MongoClient(url);
const users = require("./user");

// Database Name
const dbName = "socialnetwork";

async function main() {
  // Use connect method to connect to the server
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  const userCollection = db.collection("users");
  const postCollection = db.collection("posts");
  const commentCollection = db.collection("comments");

  // the following code examples can be pasted here...
  const generateUserCollection = () => {
    const usersWithDate = users.map((user) => ({
      ...user,
      createdAt: new Date(),
    }));
    return userCollection.insertMany(usersWithDate);
  };

  const dropPostCollection = async () => {
    return postCollection.deleteMany();
  };

  const dropCommentCollection = async () => {
    return commentCollection.deleteMany();
  };

  const dropUserCollection = async () => {
    return userCollection.deleteMany();
  };

  const deleteOneUser = (username) => userCollection.deleteOne({ username });

  const getUserId = (username) =>
    userCollection.findOne({ username }, { projection: { _id: 1 } });

  const updateOneUser = (username, nextUsername) =>
    userCollection.updateOne(
      { username },
      { $set: { username: nextUsername } }
    );

  const createOnePost = async (username, urlphoto, description) => {
    const user = await userCollection.findOne(
      { username },
      { projection: { _id: 1 } }
    );
    return postCollection.insertOne({
      userID: user._id,
      urlphoto,
      description,
      createdAt: new Date(),
    });
  };

  const getPost = async () => {
    const posts = await postCollection
      .aggregate([
        {
          $lookup: {
            from: "comments",
            localField: "comments",
            foreignField: "_id",
            as: "comments",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "user",
                },
              },{$unwind: "$user"},
              {$project: {userId:0}}
            ],
          },
        },
        {
            $lookup: {
              from: "users",
              localField: "userID",
              foreignField: "_id",
              as: "user",
            },
          },
        { $unwind: "$user" },
        {$project:{ userID:0}}
      ]).toArray();
    console.log(posts[0].comments);
  };

  const addCommentToPost = async (username, comments, postIndex) => {
    const user = await getUserId(username);
    const comment = await commentCollection.insertOne({
      userId: user._id,
      comments,
      createdAt: new Date(),
    });
    const post = await postCollection.find().toArray();
    await postCollection.updateOne(
      { _id: post[postIndex]._id },
      { $push: { comments: comment.insertedId } }
    );
  };

  await dropUserCollection();
  await generateUserCollection();
  await dropPostCollection();
  await dropCommentCollection();
  await updateOneUser("Marc Lavoine", "Joe Guitare");
  await createOnePost("Joe Guitare", "url", "ljbngvkjnpznvljznvlkznvpkzlnv");
  await createOnePost("Jean Eude", "url", "ljbngvkjnpznvljznvlkznvpkzlnv");
  await createOnePost("Jean Pascal", "url", "ljbngvkjnpznvljznvlkznvpkzlnv");
  await addCommentToPost("Jean Pascal", "ahahhahahhaahahahahahahah", 0);
  await addCommentToPost("Jean Eude", "bzbzbzbzbbzbzbzbzbzbzbzbzbz", 1);
  await addCommentToPost("Joe Guitare", "rfrfrfrfrfrfrfrfrfrfrfrfrfrf", 2);
  await addCommentToPost("Jean Pascal", "iwiwiwiwiwwiwiwiwiwiiwiwiwwi", 2);
  await addCommentToPost("Joe Guitare", "pqpqpqpqpqpqpqpqppqpqpqpqpqp", 1);
  await getPost();

  return "done.";
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());
