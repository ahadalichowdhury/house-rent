const userModel = require("../model/userModel");
const SSLCommerzPayment = require("sslcommerz-lts");
const { ObjectId } = require("mongodb");

const { catchAsync } = require("../middleware/catchAsyncError");
const { API_URL, FRONTEND_URL } = require("../config/index");
const postModel = require("../model/postModel");
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false;
const trans_id = new ObjectId().toString();

exports.paymentApply = async (req, res) => {
  const userId = req.headers.userId;
  console.log(userId)
  const postId = req.params.postId;
  console.log(postId)
  const { price } = req.body;
  try {
    const user = await userModel.findById(userId).populate("personal_info");
    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    const data = {
      total_amount: price,
      currency: "BDT",
      tran_id: trans_id, // use unique tran_id for each api call
      success_url: `${API_URL}/success/${postId}`,
      fail_url: `${FRONTEND_URL}/fail-payment`,
      cancel_url: `${FRONTEND_URL}/cancel-payment`,
      ipn_url: `${FRONTEND_URL}/ipn`,
      shipping_method: "Courier",
      product_name: "Computer.",
      product_category: "Electronic",
      product_profile: "general",
      cus_name: user?.personal_info?.name,
      cus_email: user?.email,
      cus_add1: "Dhaka",
      cus_add2: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01711111111",
      cus_fax: "01711111111",
      ship_name: "Customer Name",
      ship_add1: "Dhaka",
      ship_add2: "Dhaka",
      ship_city: "Dhaka",
      ship_state: "Dhaka",
      ship_postcode: 1000,
      ship_country: "Bangladesh",
    };
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then((apiResponse) => {
      // Redirect the user to payment gateway
      console.log(apiResponse)
      let GatewayPageURL = apiResponse.GatewayPageURL;
      console.log(GatewayPageURL)
      res.send({ url: GatewayPageURL });
      // console.log("Redirecting to: ", GatewayPageURL);
    });

  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.successPayment = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;
  console.log(postId)
  const post = await postModel.findByIdAndUpdate(
    postId,
    {
      is_paid: true,
    },
    { new: true }
  );
  console.log(post)


  if (!post) {
    return next(new ErrorHandler(404, "post not found"));
  }

  return res.status(200).redirect(`${FRONTEND_URL}/success-payment`);
  // console.log(`{process.env.FRONTEND_URL}/success-payment`)
});
