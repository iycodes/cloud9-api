// this seeding is done to make sure our data starts with data inside of it.
// so we create some data inside this file..
import { PrismaClient } from "@prisma/client";
// const { prisma, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

async function seed() {
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.comment.deleteMany();
  const user1 = await prisma.user.create({
    data: {
      coverImageSrc: "https://wallpaperaccess.com/full/2667331.jpg",
      profileImageSrc:
        "https://media.istockphoto.com/photos/studio-portrait-of-a-cheerful-woman-picture-id1368424494?k=20&m=1368424494&s=612x612&w=0&h=0w1rg9NWunDFM7ae9kptKa8iCYFyUehE1k5YH4GJy2c=",
      id: "1",
      firstname: "Leanne ",
      lastname: "Graham",
      displayName: "Samantha",
      password: "$2a$08$pBTZVjPANgCg3tGVSMuRb.bK/3sM.8ABfPPnnaBRmk44oYA8ArlZu",
      email: "Sincere@april.biz",
      phone: "1-770-736-8031 x56442",
      website: "hildegard.org",
      gender: "FEMALE",
    },
  });
  const user2 = await prisma.user.create({
    data: {
      coverImageSrc:
        "https://images.unsplash.com/photo-1586672806791-3a67d24186c0?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y292ZXIlMjBhcnR8ZW58MHx8MHx8&w=1000&q=80",
      profileImageSrc:
        "https://static-cse.canva.com/blob/944263/1600w-z_r_KC1WlmU.jpg",
      id: "2",
      firstname: "Ervin ",
      lastname: "Howell",
      displayName: "Antonette",
      email: "Shanna@melissa.tv",
      gender: "MALE",
      password: "$2a$08$pBTZVjPANgCg3tGVSMuRb.bK/3sM.8ABfPPnnaBRmk44oYA8ArlZu",
      phone: "010-692-6593 x09125",
      website: "anastasia.net",
    },
  });

  const user3 = await prisma.user.create({
    data: {
      coverImageSrc:
        "https://i.pinimg.com/originals/30/5c/5a/305c5a457807ba421ed67495c93198d3.jpg",
      profileImageSrc:
        "https://images.pexels.com/photos/1323206/pexels-photo-1323206.jpeg?cs=srgb&dl=pexels-mixu-1323206.jpg&fm=jpg",
      id: "3",
      firstname: "Clementine ",
      lastname: "Bauch",
      displayName: "Bret",
      email: "Nathan@yesenia.net",
      gender: "MALE",
      password: "$2a$08$pBTZVjPANgCg3tGVSMuRb.bK/3sM.8ABfPPnnaBRmk44oYA8ArlZu",
      phone: "1-463-123-4447",
      website: "ramiro.info",
    },
  });
  const user4 = await prisma.user.create({
    data: {
      coverImageSrc:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIYtWZkS-GVPPLhEs4ClER6ZuryXKTt5V5dzLYXWMb&s",
      profileImageSrc:
        "https://images.pexels.com/photos/268941/pexels-photo-268941.jpeg?cs=srgb&dl=pexels-pixabay-268941.jpg&fm=jpg",
      id: "4",
      firstname: "Patricia ",
      lastname: "Lebsack",
      displayName: "Karianne",
      email: "Julianne.OConner@kory.org",
      gender: "FEMALE",
      password: "$2a$08$pBTZVjPANgCg3tGVSMuRb.bK/3sM.8ABfPPnnaBRmk44oYA8ArlZu",
      phone: "493-170-9623 x156",
      website: "kale.biz",
    },
  });

  const user5 = await prisma.user.create({
    data: {
      coverImageSrc:
        "https://i.pinimg.com/736x/b3/9f/d8/b39fd8fd5ac2e8c25938e2fd1783d016--twitter-header-photos-best-facebook-cover-photos.jpg",
      profileImageSrc:
        "https://media.istockphoto.com/photos/headshot-portrait-of-smiling-ethnic-businessman-in-office-picture-id1300512215?k=20&m=1300512215&s=612x612&w=0&h=enNAE_K3bhFRebyOAPFdJtX9ru7Fo4S9BZUZZQD3v20=",
      id: "5",
      firstname: "Chelsey ",
      lastname: "Dietrich",
      displayName: "Kamren",
      email: "Lucio_Hettinger@annie.ca",
      password: "$2a$08$pBTZVjPANgCg3tGVSMuRb.bK/3sM.8ABfPPnnaBRmk44oYA8ArlZu",
      gender: "MALE",
      phone: "(254)954-1289",
      website: "demarco.info",
    },
  });

  const post1 = await prisma.post.create({
    data: {
      body: "Unpleasant nor diminution excellence apartments imprudence the met new. Draw part them he an to he roof only. Music leave say doors him. Tore bred form if sigh case as do. Staying he no looking if do opinion. Sentiments way understood end partiality and his.",
      userId: user2.id,
      title: "POST",
      displayName: await prisma.user
        .findUnique({
          where: {
            id: user2.id,
          },
        })
        .then((res) => res.name),
    },
  });

  const post2 = await prisma.post.create({
    data: {
      body: "He do subjects prepared bachelor juvenile ye oh. He feelings removing informed he as ignorant we prepared. Evening do forming observe spirits is in. Country hearted be of justice sending. On so they as with room cold ye. Be call four my went mean. Celebrated if remarkably especially an. Going eat set she books found met aware.",
      userId: user4.id,
      title: "POST",
      displayName: await prisma.user
        .findUnique({
          where: {
            id: user4.id,
          },
        })
        .then((res) => res.name),
    },
  });

  const post3 = await prisma.post.create({
    data: {
      body: "Add you viewing ten equally believe put. Separate families my on drawings do oh offended strictly elegance. Perceive jointure be mistress by jennings properly. An admiration at he discovered difficulty continuing. We in building removing possible suitable friendly on. Nay middleton him admitting consulted and behaviour son household. Recurred advanced he oh together entrance speedily suitable. Ready tried gay state fat could boy its among shall.",
      userId: user1.id,
      title: "POST",
      displayName: await prisma.user
        .findUnique({
          where: {
            id: user1.id,
          },
        })
        .then((res) => res.name),
    },
  });
  const post4 = await prisma.post.create({
    data: {
      body: "Ladyship it daughter securing procured or am moreover mr. Put sir she exercise vicinity cheerful wondered. Continual say suspicion provision you neglected sir curiosity unwilling. Simplicity end themselves increasing led day sympathize yet. General windows effects not are drawing man garrets. Common indeed garden you his ladies out yet. Preference imprudence contrasted to remarkably in on. Taken now you him trees tears any. Her object giving end sister except oppose.",
      userId: user3.id,
      title: "POST",
      displayName: await prisma.user
        .findUnique({
          where: {
            id: user3.id,
          },
        })
        .then((res) => res.name),
    },
  });
  const post5 = await prisma.post.create({
    data: {
      body: "Lorem Ipsum comes from a latin text written in 45BC by Roman statesman, lawyer, scholar, and philosopher, Marcus Tullius Cicero. The text is titled de Finibus Bonorum et Malorum which means The Extremes of Good and Evil. The most common form of Lorem ipsum is the following:",
      userId: user2.id,
      title: "POST",
      displayName: await prisma.user
        .findUnique({
          where: {
            id: user2.id,
          },
        })
        .then((res) => res.name),
    },
  });
  const comment1 = await prisma.comment.create({
    data: { body: "lovely post ", postId: post5.id, userId: user1.id },
  });

  const comment11 = await prisma.comment.create({
    data: {
      body: "none of my business bro..",
      postId: post5.id,
      parentId: comment1.id,
      userId: user3.id,
    },
  });
  const comment12 = await prisma.comment.create({
    data: {
      body: "none of my business bro..",
      postId: post5.id,
      parentId: comment1.id,
      userId: user2.id,
    },
  });
  const comment13 = await prisma.comment.create({
    data: {
      body: "none of my business bro..",
      postId: post5.id,
      parentId: comment1.id,
      userId: user4.id,
    },
  });
  const comment121 = await prisma.comment.create({
    data: {
      body: "none of my business bro..",
      postId: post5.id,
      parentId: comment12.id,
      userId: user5.id,
    },
  });

  const comment111 = await prisma.comment.create({
    data: {
      body: "confidently spiting shit on the internet",
      parentId: comment11.id,
      postId: post5.id,
      userId: user2.id,
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      body: "gotta admit you're right!",
      postId: post2.id,
      userId: user2.id,
    },
  });

  const comment5 = await prisma.comment.create({
    data: {
      body: "yeah what ever bro.. motherfucking cunt!!",
      postId: post5.id,
      userId: user1.id,
    },
  });

  const comment51 = await prisma.comment.create({
    data: {
      body: "bro, what the fuck are you even typing..??",
      parentId: comment5.id,
      userId: user4.id,
      postId: post5.id,
    },
  });

  const comment511 = await prisma.comment.create({
    data: {
      body: "ask yo mama niqqa!",
      parentId: comment51.id,
      postId: post5.id,
      userId: user1.id,
    },
  });

  // const like1 = await prisma.like.create({
  //   data: { userId: user2.id, postId: post5.id },
  // });

  // const like2 = await prisma.like.create({
  //   data: { userId: user3.id, postId: post1.id },
  // });

  // const like3 = await prisma.like.create({
  //   data: { userId: user4.id, postId: post4.id },
  // });

  // const followerTest = await prisma.follows.create({
  //   data: {
  //     id: "12",
  //     followerId: "1",
  //     followingId: "2",
  //   },
  // });

  // const lol = await prisma.follows.create({
  //   data: {
  //     id: "42",
  //     followerId: "4",
  //     followingId: "2",
  //   },
  // });
}
// async function seed2() {
//   const deleteAllLikes = await prisma.like.deleteMany({});
// }

async function seed2() {
  await prisma.post.deleteMany({
    where: {
      title: "BROADCAST",
    },
  });
}
async function seed3() {
  await prisma.user.update({
    where: {
      email: "iyanufanoro@gmail.com",
    },
    data: {
      coverImageSrc:
        "https://images.unsplash.com/photo-1504805572947-34fad45aed93?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8OXx8cmFuZG9tLi4ufGVufDB8fDB8fA%3D%3D&w=1000&q=80",
      profileImageSrc: "https://i.ibb.co/Wv9Tfkm/IMG-2446.jpg",
    },
  });
}

// seed2();
seed();
