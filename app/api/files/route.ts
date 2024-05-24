// import { assistantId } from "@/app/assistant-config";
//import { openai } from OpenAI;
// @ts-nocheck

import OpenAI from "openai";
import { Files } from "openai/resources";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});
const assistantId = process.env.ASSISTANT_ID ??
(() => {
  throw new Error('ASSISTANT_ID is not set');
})()

// upload file to assistant's vector store
export async function POST(req: Request) {
  const formData = await req.formData(); // process file as FormData
  const file = formData.get("file"); // retrieve the single file from FormData
  console.log(file)
  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
  if (file == null) {
    return
  }
  console.log('file is not null')
  // upload using the file stream
  const openaiFile = await openai.files.create({
    file: file,
    purpose: "assistants",
  });
  console.log('file created', openaiFile.id)

  // add file to vector store
  const vectorStoreFile = await openai.beta.vectorStores.files.create(vectorStoreId, {
    file_id: openaiFile.id,
  });
  console.log('vector store', vectorStoreFile)
  return new Response();
}

// list files in assistant's vector store
export async function GET() {
  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
  const fileList = await openai.beta.vectorStores.files.list(vectorStoreId);
  // {
  //   "object": "list",
  //   "data": [
  //     {
  //       "id": "file-VVAaKl1AmmSYEAUZlEdQ2Dik",
  //       "object": "vector_store.file",
  //       "usage_bytes": 92073,
  //       "created_at": 1716523750,
  //       "vector_store_id": "vs_JNbKVRaJBtzk3urKYAc0fnn9",
  //       "status": "completed",
  //       "last_error": null
  //     }
  //   ],
  //   "first_id": "file-VVAaKl1AmmSYEAUZlEdQ2Dik",
  //   "last_id": "file-VVAaKl1AmmSYEAUZlEdQ2Dik",
  //   "has_more": false
  // }
  console.log(fileList)
  const filesArray = await Promise.all(
    fileList.data.map(async (file) => {
      const fileDetails = await openai.files.retrieve(file.id);
      console.log(file.id)
      const vectorFileDetails = await openai.beta.vectorStores.files.retrieve(
        vectorStoreId,
        file.id
      );
      console.log(vectorFileDetails)
      console.log({
        file_id: file.id,
        filename: fileDetails.filename,
        status: vectorFileDetails.status,
      })
      return {
        file_id: file.id,
        filename: fileDetails.filename,
        status: vectorFileDetails.status,
      };
    })
  );
  console.log(filesArray)
  return Response.json(filesArray);
}

// delete file from assistant's vector store
export async function DELETE(req: { json: () => any; }) {
  const body = await req.json();
  const fileId = body.fileId;

  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
  await openai.beta.vectorStores.files.del(vectorStoreId, fileId); // delete file from vector store

  return new Response();
}

/* Helper functions */

const getOrCreateVectorStore = async () => {
  const assistant = await openai.beta.assistants.retrieve(assistantId);

  // if the assistant already has a vector store, return it
  if (assistant.tool_resources?.file_search?.vector_store_ids?.length > 0) {
   return assistant.tool_resources.file_search.vector_store_ids[0];
  }
  // otherwise, create a new vector store and attatch it to the assistant
  const vectorStore = await openai.beta.vectorStores.create({
    name: "sample-assistant-vector-store",
  });
  await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });
  return vectorStore.id;
};